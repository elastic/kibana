/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Creates a mock DOMRect from positional arguments or a partial override. */
export const makeRect = (
  xOrOverrides: number | Partial<DOMRect> = {},
  y = 0,
  w = 100,
  h = 50
): DOMRect => {
  if (typeof xOrOverrides === 'number') {
    const x = xOrOverrides;
    return {
      x,
      y,
      left: x,
      top: y,
      width: w,
      height: h,
      right: x + w,
      bottom: y + h,
      toJSON: jest.fn(),
    };
  }
  return {
    x: 0,
    y: 0,
    left: 100,
    top: 200,
    width: 80,
    height: 40,
    right: 180,
    bottom: 240,
    toJSON: jest.fn(),
    ...xOrOverrides,
  };
};
