/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PNG } from 'pngjs';
import { resizePng } from './resize_png';

type Rgba = [number, number, number, number];

const makePng = (width: number, height: number, colorAt: (x: number, y: number) => Rgba) => {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      png.data.set(colorAt(x, y), (y * width + x) * 4);
    }
  }
  return png;
};

const pixelAt = (png: PNG, x: number, y: number): Rgba =>
  Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)) as Rgba;

const RED: Rgba = [255, 0, 0, 255];
const BLUE: Rgba = [0, 0, 255, 255];

describe('resizePng', () => {
  it('returns identical pixels when the size does not change', () => {
    const src = makePng(3, 2, (x, y) => [x * 50, y * 100, 7, 255]);
    const out = resizePng(src, 3, 2);
    expect(Buffer.from(out.data)).toEqual(Buffer.from(src.data));
  });

  it('averages each 2x2 block on an exact 2x downscale', () => {
    // left half red, right half blue, so the middle output column blends both
    const src = makePng(4, 2, (x) => (x < 2 ? RED : BLUE));
    const out = resizePng(src, 2, 1);
    expect(pixelAt(out, 0, 0)).toEqual(RED);
    expect(pixelAt(out, 1, 0)).toEqual(BLUE);

    const mixed = makePng(2, 2, (x, y) => (x === y ? RED : BLUE));
    const [r, g, b, a] = pixelAt(resizePng(mixed, 1, 1), 0, 0);
    expect([r, g, b, a]).toEqual([128, 0, 128, 255]);
  });

  it('fills an upscale from a single pixel with that pixel', () => {
    const out = resizePng(
      makePng(1, 1, () => RED),
      3,
      3
    );
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(pixelAt(out, x, y)).toEqual(RED);
      }
    }
  });

  it('stretches non-integer ratios without going out of bounds', () => {
    const src = makePng(3, 3, (x) => (x === 0 ? RED : BLUE));
    const out = resizePng(src, 7, 5);
    expect(out.width).toBe(7);
    expect(out.height).toBe(5);
    expect(pixelAt(out, 0, 0)).toEqual(RED);
    expect(pixelAt(out, 6, 4)).toEqual(BLUE);
  });
});
