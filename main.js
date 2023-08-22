// Seleccionar el elemento de video del DOM usando su ID variable
const video = document.getElementById('video');

// Función para iniciar la captura de video desde la cámara
function startVideo() {
    // Verificar si el navegador admite getUserMedia para acceder a la cámara
    navigator.getUserMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
    );

    // Si getUserMedia es compatible con el navegador
    if (navigator.getUserMedia) {
        // Solicitar acceso a la cámara
        navigator.getUserMedia(
            { video: {} },
            stream => {
                // Asignar el flujo de video a la etiqueta de video
                video.srcObject = stream;
                // Reproducir el video cuando se cargan los metadatos
                video.onloadedmetadata = () => {
                    video.play();
                };
            },
            err => console.log(err)
        );
    } else {
        // Si getUserMedia no es compatible, mostrar un mensaje de error en la consola
        console.log('getUserMedia no está disponible en este navegador.');
    }
}

// Cargar los modelos necesarios para la detección facial, landmarks, descripciones de rostros, expresiones faciales, edad y género
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(() => {
    // Iniciar la captura de video desde la cámara
    startVideo();

    // Agregar un evento para cuando el video comienza a reproducirse
    video.addEventListener('play', async () => {
        // Crear un lienzo para dibujar sobre el video
        const canvas = faceapi.createCanvasFromMedia(video);
        document.body.append(canvas);
        
        // Definir el tamaño de visualización del lienzo igual al tamaño del video
        const displaySize = { width: video.width, height: video.height };
        // Ajustar las dimensiones del lienzo al tamaño del video
        faceapi.matchDimensions(canvas, displaySize);
        
        // Ejecutar una función repetidamente cada 100ms
        setInterval(async () => {
            // Detectar todas las caras en el video con landmarks, descripciones de rostros, expresiones faciales, edad y género
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withAgeAndGender();

            // Redimensionar los resultados de la detección según el tamaño del lienzo
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Limpiar el lienzo antes de dibujar los resultados
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // Dibujar los cuadros de detección y los landmarks en el lienzo
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            
            // Para cada detección (cara) en los resultados
            resizedDetections.forEach(result => {
                // Extraer la edad, género y probabilidad de género de la detección
                const { age, gender} = result;
                // Crear un campo de texto con la edad y género
                new faceapi.draw.DrawTextField(
                    [
                        `${faceapi.utils.round(age, 0)} años`,
                    ],
                    result.detection.box.bottomLeft // Posición del campo de texto
                ).draw(canvas); // Dibujar el campo de texto en el lienzo
            });

        }, 100); // Intervalo de 100ms
    });
});
