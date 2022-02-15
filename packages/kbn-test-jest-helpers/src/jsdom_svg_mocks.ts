/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const setHTMLElementClientSizes = (width: number, height: number) => {
  const spyWidth = jest.spyOn(window.HTMLElement.prototype, 'clientWidth', 'get');
  spyWidth.mockReturnValue(width);
  const spyHeight = jest.spyOn(window.HTMLElement.prototype, 'clientHeight', 'get');
  spyHeight.mockReturnValue(height);

  return {
    mockRestore: () => {
      spyWidth.mockRestore();
      spyHeight.mockRestore();
    },
  };
};

export const setSVGElementGetBBox = (
  width: number,
  height: number,
  x: number = 0,
  y: number = 0
) => {
  const SVGElementPrototype = SVGElement.prototype as any;
  const originalGetBBox = SVGElementPrototype.getBBox;

  // getBBox is not in the SVGElement.prototype object by default, so we cannot use jest.spyOn for that case
  SVGElementPrototype.getBBox = jest.fn(() => ({
    x,
    y,
    width,
    height,
  }));

  return {
    mockRestore: () => {
      SVGElementPrototype.getBBox = originalGetBBox;
    },
  };
};

export const setSVGElementGetComputedTextLength = (width: number) => {
  const SVGElementPrototype = SVGElement.prototype as any;
  const originalGetComputedTextLength = SVGElementPrototype.getComputedTextLength;

  // getComputedTextLength is not in the SVGElement.prototype object by default, so we cannot use jest.spyOn for that case
  SVGElementPrototype.getComputedTextLength = jest.fn(() => width);

  return {
    mockRestore: () => {
      SVGElementPrototype.getComputedTextLength = originalGetComputedTextLength;
    },
  };
};

export const setHTMLElementOffset = (width: number, height: number) => {
  const offsetWidthSpy = jest.spyOn(window.HTMLElement.prototype, 'offsetWidth', 'get');
  offsetWidthSpy.mockReturnValue(width);

  const offsetHeightSpy = jest.spyOn(window.HTMLElement.prototype, 'offsetHeight', 'get');
  offsetHeightSpy.mockReturnValue(height);

  return {
    mockRestore: () => {
      offsetWidthSpy.mockRestore();
      offsetHeightSpy.mockRestore();
    },
  };
};
