/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPreviewDimensions } from './get_dimensions';

describe('getPreviewDimensions', () => {
  const mockCanvas = (width: number, height: number) =>
    ({
      width,
      height,
    } as HTMLCanvasElement);

  it('should handle a capture that already has the correct aspect ratio', () => {
    const capture = mockCanvas(800, 600);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxWidth: 400,
      maxHeight: 300,
      aspectRatio: 0.75,
    });

    expect(width).toBe(400);
    expect(height).toBe(300);
    expect(drawImageParams).toEqual([0, 0, 800, 600, 0, 0, 400, 300]);
  });

  it('should crop a taller capture vertically', () => {
    const capture = mockCanvas(800, 800);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxWidth: 400,
      maxHeight: 300,
      aspectRatio: 0.75,
    });

    expect(width).toBe(400);
    expect(height).toBe(300);
    expect(drawImageParams).toEqual([0, 0, 800, 600, 0, 0, 400, 300]);
  });

  it('should crop a wider capture horizontally', () => {
    const capture = mockCanvas(1000, 600);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxWidth: 400,
      maxHeight: 300,
      aspectRatio: 0.75,
    });

    expect(width).toBe(400);
    expect(height).toBe(300);
    expect(drawImageParams).toEqual([100, 0, 800, 600, 0, 0, 400, 300]);
  });

  it('should scale down to fit maxWidth', () => {
    const capture = mockCanvas(1600, 1200);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxWidth: 400,
      aspectRatio: 0.75,
    });

    expect(width).toBe(400);
    expect(height).toBe(300);
    expect(drawImageParams).toEqual([0, 0, 1600, 1200, 0, 0, 400, 300]);
  });

  it('should scale down to fit maxHeight', () => {
    const capture = mockCanvas(800, 600);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxHeight: 150,
      aspectRatio: 0.75,
    });

    expect(width).toBe(200);
    expect(height).toBe(150);
    expect(drawImageParams).toEqual([0, 0, 800, 600, 0, 0, 200, 150]);
  });

  it('should not scale up larger than the original cropped size', () => {
    const capture = mockCanvas(200, 150);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
      maxWidth: 400,
      maxHeight: 300,
      aspectRatio: 0.75,
    });

    expect(width).toBe(200);
    expect(height).toBe(150);
    expect(drawImageParams).toEqual([0, 0, 200, 150, 0, 0, 200, 150]);
  });

  it('should use default aspect ratio and max width when not provided', () => {
    const capture = mockCanvas(800, 600);
    const { width, height, drawImageParams } = getPreviewDimensions({
      capture,
    });

    expect(width).toBe(400);
    expect(height).toBe(300);
    expect(drawImageParams).toEqual([0, 0, 800, 600, 0, 0, 400, 300]);
  });
});
