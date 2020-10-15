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
