/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { compareImages } from './compare_images';

const createSolidPng = ({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: [number, number, number, number];
}): Buffer => {
  const png = new PNG({ width, height });

  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = color[0];
    png.data[offset + 1] = color[1];
    png.data[offset + 2] = color[2];
    png.data[offset + 3] = color[3];
  }

  return PNG.sync.write(png);
};

describe('compareImages', () => {
  it('returns no diff for identical images', async () => {
    const imageBuffer = createSolidPng({
      width: 4,
      height: 4,
      color: [0, 0, 0, 255],
    });

    await expect(
      compareImages({
        actualBuffer: imageBuffer,
        baselineBuffer: imageBuffer,
      })
    ).resolves.toEqual({
      dimensionMismatch: false,
      mismatchRatio: 0,
    });
  });

  it('writes a diff when pixels do not match', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-vrt-'));
    const diffPath = path.join(tempDir, 'diff.png');

    const result = await compareImages({
      actualBuffer: createSolidPng({
        width: 4,
        height: 4,
        color: [0, 0, 0, 255],
      }),
      baselineBuffer: createSolidPng({
        width: 4,
        height: 4,
        color: [255, 255, 255, 255],
      }),
      diffPath,
    });

    expect(result.dimensionMismatch).toBe(false);
    expect(result.mismatchRatio).toBeGreaterThan(0);
    expect(fs.existsSync(diffPath)).toBe(true);
  });

  it('reports dimension mismatches', async () => {
    const result = await compareImages({
      actualBuffer: createSolidPng({
        width: 8,
        height: 4,
        color: [0, 0, 0, 255],
      }),
      baselineBuffer: createSolidPng({
        width: 4,
        height: 4,
        color: [0, 0, 0, 255],
      }),
    });

    expect(result.dimensionMismatch).toBe(true);
  });
});
