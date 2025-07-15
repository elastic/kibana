/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { takePreviewScreenshot } from './take_screenshot';
import * as lib from './lib';
import html2canvas from 'html2canvas';

jest.mock('html2canvas');
jest.mock('./lib', () => ({
  ...jest.requireActual('./lib'),
  getPreviewDimensions: jest.fn(),
  storePreviewScreenshot: jest.fn(),
}));

describe('takePreviewScreenshot', () => {
  const props = {
    savedObjectId: 'some-id',
  };
  const storePreviewScreenshotMock = lib.storePreviewScreenshot as jest.Mock;
  const getPreviewDimensionsMock = lib.getPreviewDimensions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    storePreviewScreenshotMock.mockReturnValue(true);
    getPreviewDimensionsMock.mockReturnValue({
      drawImageParams: [0, 0, 1, 1, 0, 0, 1, 1],
      width: 1,
      height: 1,
    });
  });

  it('should return false if container is not found', async () => {
    const result = await takePreviewScreenshot(props);
    expect(result).toBe(false);
  });

  describe('with a container in the DOM', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.classList.add('test-container');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    const spyOnCreateElementCanvas = (mockCanvas: HTMLCanvasElement) => {
      const originalCreateElement = document.createElement;
      const spy = jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
          if (tagName === 'canvas' && spy.mock.calls.length === 1) {
            return mockCanvas;
          }
          return originalCreateElement.call(document, tagName, options);
        });
      return spy;
    };

    it('should take a screenshot and store it', async () => {
      const canvas = document.createElement('canvas');
      (html2canvas as jest.Mock).mockResolvedValue(canvas);

      const result = await takePreviewScreenshot({
        ...props,
        querySelector: '.test-container',
      });

      expect(html2canvas).toHaveBeenCalledWith(container, {
        allowTaint: true,
        scale: window.devicePixelRatio,
        scrollX: 0,
        scrollY: 0,
        width: container.scrollWidth,
        height: container.scrollHeight,
      });
      expect(storePreviewScreenshotMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should resize the screenshot if dimensions are provided', async () => {
      const canvas = document.createElement('canvas');
      const toDataURLMock = jest.fn().mockReturnValue('data-url');
      canvas.toDataURL = toDataURLMock;
      (html2canvas as jest.Mock).mockResolvedValue(canvas);

      const resizedCanvas = document.createElement('canvas');
      const resizedToDataURLMock = jest.fn().mockReturnValue('resized-data-url');
      resizedCanvas.toDataURL = resizedToDataURLMock;
      const mockDrawImage = jest.fn();
      const mockContext = {
        drawImage: mockDrawImage,
        imageSmoothingQuality: 'low' as const,
      };
      const getContextMock = jest.fn().mockReturnValue(mockContext);
      resizedCanvas.getContext = getContextMock;

      const createElementSpy = spyOnCreateElementCanvas(resizedCanvas);

      getPreviewDimensionsMock.mockReturnValue({
        drawImageParams: [1, 2, 3, 4, 5, 6, 7, 8],
        height: 100,
        width: 200,
      });

      const result = await takePreviewScreenshot({
        ...props,
        querySelector: '.test-container',
        maxWidth: 200,
        maxHeight: 100,
        aspectRatio: 16 / 9,
      });

      expect(result).toBe(true);
      expect(getPreviewDimensionsMock).toHaveBeenCalledWith({
        capture: canvas,
        maxWidth: 200,
        maxHeight: 100,
        aspectRatio: 16 / 9,
      });
      expect(resizedCanvas.width).toBe(200);
      expect(resizedCanvas.height).toBe(100);
      expect(mockContext.imageSmoothingQuality).toBe('high');
      expect(mockDrawImage).toHaveBeenCalledWith(canvas, 1, 2, 3, 4, 5, 6, 7, 8);
      expect(storePreviewScreenshotMock).toHaveBeenCalledWith({
        savedObjectId: props.savedObjectId,
        dataUrl: 'resized-data-url',
      });

      createElementSpy.mockRestore();
    });

    describe('error handling', () => {
      let consoleErrorSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      it('should handle html2canvas errors gracefully', async () => {
        (html2canvas as jest.Mock).mockRejectedValue(new Error('test error'));

        const result = await takePreviewScreenshot({
          ...props,
          querySelector: '.test-container',
        });

        expect(result).toBe(false);
        expect(storePreviewScreenshotMock).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to take preview screenshot',
          expect.any(Error)
        );
      });

      it('should handle storePreviewScreenshot errors gracefully', async () => {
        const canvas = document.createElement('canvas');
        (html2canvas as jest.Mock).mockResolvedValue(canvas);
        storePreviewScreenshotMock.mockImplementation(() => {
          throw new Error('test error');
        });

        const result = await takePreviewScreenshot({
          ...props,
          querySelector: '.test-container',
        });

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to take preview screenshot',
          expect.any(Error)
        );
      });

      it('should return false if context cannot be created', async () => {
        const canvas = document.createElement('canvas');
        (html2canvas as jest.Mock).mockResolvedValue(canvas);

        const resizedCanvasWithNullContext = document.createElement('canvas');
        jest.spyOn(resizedCanvasWithNullContext, 'getContext').mockReturnValue(null);

        const createElementSpy = spyOnCreateElementCanvas(resizedCanvasWithNullContext);

        const result = await takePreviewScreenshot({
          ...props,
          querySelector: '.test-container',
          maxWidth: 100,
        });

        expect(result).toBe(false);
        expect(storePreviewScreenshotMock).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create 2d context for preview screenshot'
        );

        createElementSpy.mockRestore();
      });
    });
  });
});
