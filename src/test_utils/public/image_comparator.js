/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

  async compareDOMContents(
    domContentsText,
    sourceWidth,
    sourceHeight,
    expectedImageSourcePng,
    threshold
  ) {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    sourceCanvas.style.position = 'fixed';
    sourceCanvas.style.left = 0;
    sourceCanvas.style.top = 0;
    sourceCanvas.style.border = '1px solid blue';
    const sourceContext2d = sourceCanvas.getContext('2d');
    document.body.appendChild(sourceCanvas);

    const sourceData = `<svg xmlns="http://www.w3.org/2000/svg" width="${sourceWidth}" height="${sourceHeight}">
        <foreignObject width="100%" height="100%">
        ${domContentsText}
        </foreignObject>
      </svg>`;

    const sourceImage = new Image();
    return new Promise((resolve, reject) => {
      sourceImage.onload = async () => {
        sourceContext2d.drawImage(sourceImage, 0, 0);
        const mismatch = await this.compareImage(sourceCanvas, expectedImageSourcePng, threshold);
        document.body.removeChild(sourceCanvas);
        resolve(mismatch);
      };
      sourceImage.onerror = (e) => {
        reject(e.message);
      };
      sourceImage.src = 'data:image/svg+xml;base64,' + btoa(sourceData);
    });
  }

  /**
   * Do pixel-comparison of two images
   * @param actualCanvasFromUser HTMl5 canvas
   * @param expectedImageSourcePng Img to compare to
   * @param threshold number between 0-1. A lower number indicates a lower tolerance for pixel-differences.
   * @return number
   */
  async compareImage(actualCanvasFromUser, expectedImageSourcePng, threshold) {
    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        const actualContextFromUser = actualCanvasFromUser.getContext('2d');
        const actualImageDataFromUser = actualContextFromUser.getImageData(
          0,
          0,
          actualCanvasFromUser.width,
          actualCanvasFromUser.height
        );
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
          expectCtx.drawImage(
            expectedImage,
            0,
            0,
            this._actualCanvas.width,
            this._actualCanvas.height
          ); // draw reference image to size of generated image

          const expectImageData = expectCtx.getImageData(
            0,
            0,
            this._actualCanvas.width,
            this._actualCanvas.height
          );

          // compare live map vs expected pixel data
          const diffImage = expectCtx.createImageData(
            this._actualCanvas.width,
            this._actualCanvas.height
          );
          const mismatchedPixels = pixelmatch(
            actualImageDataFromUser.data,
            expectImageData.data,
            diffImage.data,
            this._actualCanvas.width,
            this._actualCanvas.height,
            { threshold: threshold }
          );

          const diffContext = this._diffCanvas.getContext('2d');
          this._diffCanvas.width = this._actualCanvas.width;
          this._diffCanvas.height = this._actualCanvas.height;
          diffContext.putImageData(diffImage, 0, 0);

          resolve(mismatchedPixels);
        };

        expectedImage.onerror = (e) => {
          reject(e.message);
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
