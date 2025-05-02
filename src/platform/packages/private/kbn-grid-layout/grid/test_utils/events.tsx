/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent } from '@testing-library/react';
import { PointerPosition } from '../use_grid_layout_events/types';

class TouchEventFake extends Event {
  constructor(public touches: PointerPosition[]) {
    super('touchmove');
    this.touches = [{ clientX: 256, clientY: 128 }];
  }
}

export const mouseStartDragging = (
  handle: HTMLElement,
  options: PointerPosition = { clientX: 0, clientY: 0 }
) => {
  fireEvent.mouseDown(handle, options);
};

export const mouseMoveTo = (options: PointerPosition = { clientX: 256, clientY: 128 }) => {
  fireEvent.mouseMove(document, options);
};

export const mouseDrop = (handle: HTMLElement) => {
  fireEvent.mouseUp(handle);
};
export const touchStart = (
  handle: HTMLElement,
  options: { touches: PointerPosition[] } = { touches: [{ clientX: 0, clientY: 0 }] }
) => {
  fireEvent.touchStart(handle, options);
};

export const touchMoveTo = (
  handle: HTMLElement,
  options: { touches: PointerPosition[] } = { touches: [{ clientX: 256, clientY: 128 }] }
) => {
  const realTouchEvent = window.TouchEvent;
  // @ts-expect-error
  window.TouchEvent = TouchEventFake;
  fireEvent.touchMove(handle, new TouchEventFake(options.touches));
  window.TouchEvent = realTouchEvent;
};

export const touchEnd = (handle: HTMLElement) => {
  fireEvent.touchEnd(handle);
};
