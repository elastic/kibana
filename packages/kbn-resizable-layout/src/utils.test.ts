/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ResizableLayoutDirection } from '../types';
import { getContainerSize, percentToPixels, pixelsToPercent } from './utils';

describe('getContainerSize', () => {
  it('should return the width when direction is horizontal', () => {
    expect(getContainerSize(ResizableLayoutDirection.Horizontal, 100, 200)).toBe(100);
  });

  it('should return the height when direction is vertical', () => {
    expect(getContainerSize(ResizableLayoutDirection.Vertical, 100, 200)).toBe(200);
  });
});

describe('percentToPixels', () => {
  it('should convert percentage to pixels', () => {
    expect(percentToPixels(250, 50)).toBe(125);
  });
});

describe('pixelsToPercent', () => {
  it('should convert pixels to percentage', () => {
    expect(pixelsToPercent(250, 125)).toBe(50);
  });

  it('should clamp percentage to 0 when pixels is negative', () => {
    expect(pixelsToPercent(250, -125)).toBe(0);
  });

  it('should clamp percentage to 100 when pixels is greater than container size', () => {
    expect(pixelsToPercent(250, 500)).toBe(100);
  });
});
