/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DataGridLayoutMockOptions {
  /** Height of every grid viewport, in pixels. */
  readonly viewportHeight?: number;
  /** Height of every row, in pixels. */
  readonly rowHeight?: number;
  /** Width of every grid and row, in pixels. */
  readonly width?: number;
}

const createRectList = (rectWidth: number, rectHeight: number): DOMRectList => {
  const rect: DOMRect = {
    x: 0,
    y: 0,
    width: rectWidth,
    height: rectHeight,
    top: 0,
    right: rectWidth,
    bottom: rectHeight,
    left: 0,
    toJSON: () => ({}),
  };
  const rects = [rect];
  return {
    0: rect,
    length: rects.length,
    item: (index) => rects[index] ?? null,
    [Symbol.iterator]: () => rects[Symbol.iterator](),
  };
};

/**
 * Gives every `DataGrid` rendered in JSDOM, which has no layout, a viewport, fixed row heights, and
 * displayed cell content, so that its rows virtualize and the focusable content of its cells is found
 * as they would be in a browser. Returns a function that restores JSDOM's layout. Which DOM
 * measurements the grid reads is a private detail that this mock keeps up to date.
 */
export const mockDataGridLayout = ({
  viewportHeight = 400,
  rowHeight = 34,
  width = 600,
}: DataGridLayoutMockOptions = {}): (() => void) => {
  const getSize = (element: Element) => {
    switch (element.getAttribute('role')) {
      case 'grid':
        return { width, height: viewportHeight };
      case 'row':
        return { width, height: rowHeight };
      default:
        return { width: 0, height: 0 };
    }
  };
  const sizeOf = (dimension: 'height' | 'width') =>
    function (this: Element) {
      return getSize(this)[dimension];
    };
  const nativeGetClientRects = Element.prototype.getClientRects;
  const displayedRects = createRectList(width, rowHeight);
  // The virtualizer reads the viewport from the client size and rows from the offset size. Focusable
  // content counts as displayed only when it has client rects, which JSDOM never gives.
  const spies = [
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(sizeOf('height')),
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(sizeOf('width')),
    jest.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(sizeOf('height')),
    jest.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(sizeOf('width')),
    jest
      .spyOn(Element.prototype, 'getClientRects')
      .mockImplementation(function getClientRects(this: Element) {
        return this.closest('[role="grid"]') ? displayedRects : nativeGetClientRects.call(this);
      }),
  ];

  return () => {
    spies.forEach((spy) => spy.mockRestore());
  };
};
