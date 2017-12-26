import pixelmatch from 'pixelmatch';

/**
 * Utility to compare pixels of two images
 * Adds the snapshots and comparison to the corners of the HTML-body to help with human inspection.
 */
export class ImageComparator {

  constructor() {

    this._expectCanvas = document.createElement('canvas');
    this._expectCanvas.style.position = 'fixed';
    this._expectCanvas.style.right = 0;
    this._expectCanvas.style.top = 0;
    this._expectCanvas.style.border = '1px solid green';
    document.body.appendChild(this._expectCanvas);

    this._diffCanvas = document.createElement('canvas');
    this._diffCanvas.style.position = 'fixed';
    this._diffCanvas.style.right = 0;
    this._diffCanvas.style.bottom = 0;
    this._diffCanvas.style.border = '1px solid red';
    document.body.appendChild(this._diffCanvas);

    this._actualCanvas = document.createElement('canvas');
    this._actualCanvas.style.position = 'fixed';
    this._actualCanvas.style.left = 0;
    this._actualCanvas.style.bottom = 0;
    this._actualCanvas.style.border = '1px solid yellow';
    document.body.appendChild(this._actualCanvas);

  }

  /**
   * Do pixel-comparison of two images
   * @param actualCanvasFromUser HTMl5 canvas
   * @param expectedImageSourcePng Img to compare to
   * @param threshold number between 0-1. A lower number indicates a lower tolerance for pixel-differences.
   * @return number
   */
  async  compareImage(actualCanvasFromUser, expectedImageSourcePng, threshold) {

    console.log('compare image:actual ', actualCanvasFromUser);
    console.log('compare image:expected ', expectedImageSourcePng);

    return new Promise((resolve) => {


      window.setTimeout(() => {

        const actualContextFromUser = actualCanvasFromUser.getContext('2d');
        const actualImageDataFromUser = actualContextFromUser.getImageData(0, 0, actualCanvasFromUser.width, actualCanvasFromUser.height);
        const actualContext = this._actualCanvas.getContext('2d');
        this._actualCanvas.width = actualCanvasFromUser.width;
        this._actualCanvas.height = actualCanvasFromUser.height;
        actualContext.putImageData(actualImageDataFromUser, 0, 0);

        // convert expect PNG into pixel data by drawing in new canvas element
        this._expectCanvas.width = this._actualCanvas.width;
        this._expectCanvas.height = this._actualCanvas.height;

        const expectedImage = new Image();
        expectedImage.onload = () => {

          const expectCtx = this._expectCanvas.getContext('2d');
          expectCtx.drawImage(expectedImage, 0, 0, this._actualCanvas.width, this._actualCanvas.height);  // draw reference image to size of generated image

          const expectImageData = expectCtx.getImageData(0, 0, this._actualCanvas.width, this._actualCanvas.height);

          // compare live map vs expected pixel data
          const diffImage = expectCtx.createImageData(this._actualCanvas.width, this._actualCanvas.height);
          const mismatchedPixels = pixelmatch(
            actualImageDataFromUser.data,
            expectImageData.data,
            diffImage.data,
            this._actualCanvas.width,
            this._actualCanvas.height,
            { threshold: threshold });


          const diffContext = this._diffCanvas.getContext('2d');
          this._diffCanvas.width = this._actualCanvas.width;
          this._diffCanvas.height = this._actualCanvas.height;
          diffContext.putImageData(diffImage, 0, 0);

          resolve(mismatchedPixels);
        };
        expectedImage.src = expectedImageSourcePng;
      });
    });


  }


  destroy() {
    document.body.removeChild(this._expectCanvas);
    document.body.removeChild(this._diffCanvas);
    document.body.removeChild(this._actualCanvas);
  }


}
