/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

if (typeof globalThis.DOMRect === 'undefined') {
  const DOMRectPolyfill = function DOMRect(
    this: Record<string, number>,
    x = 0,
    y = 0,
    w = 0,
    h = 0
  ) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.top = y;
    this.right = x + w;
    this.bottom = y + h;
    this.left = x;
  };
  DOMRectPolyfill.prototype.toJSON = function () {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  };
  (globalThis as unknown as Record<string, unknown>).DOMRect = DOMRectPolyfill;
}

if (typeof globalThis.PointerEvent === 'undefined') {
  const PointerEventPolyfill = function PointerEvent(
    this: Record<string, unknown>,
    type: string,
    params: PointerEventInit = {}
  ) {
    const event = new MouseEvent(type, params);
    Object.setPrototypeOf(event, PointerEventPolyfill.prototype);
    (event as unknown as Record<string, unknown>).pointerId = params.pointerId ?? 0;
    return event;
  } as unknown as typeof PointerEvent;
  Object.setPrototypeOf(PointerEventPolyfill.prototype, MouseEvent.prototype);
  (globalThis as unknown as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
}
