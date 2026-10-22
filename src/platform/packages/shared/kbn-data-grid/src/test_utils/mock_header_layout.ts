/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

class TestPointerEvent extends MouseEvent {
  pointerType: string;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? true;
  }
}

/**
 * jsdom has neither pointer events nor layout: adds a PointerEvent based on MouseEvent and lays out
 * the elements with a `data-gridcell-column-id` (headers and cells) by their column id. Other
 * elements get the size of the whole grid. Returns a function that restores both.
 */
export const mockHeaderLayout = (
  rects: Record<string, { left: number; width: number }>
): (() => void) => {
  const originalPointerEvent = window.PointerEvent;
  Object.defineProperty(window, 'PointerEvent', { value: TestPointerEvent, configurable: true });
  const spy = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const { left, width } = rects[this.dataset.gridcellColumnId ?? ''] ?? { left: 0, width: 800 };
      return {
        left,
        width,
        right: left + width,
        x: left,
        top: 0,
        bottom: 30,
        height: 30,
        y: 0,
        toJSON: () => ({ left, width }),
      };
    });
  return () => {
    Object.defineProperty(window, 'PointerEvent', {
      value: originalPointerEvent,
      configurable: true,
    });
    spy.mockRestore();
  };
};
