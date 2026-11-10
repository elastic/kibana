/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join, parse } from 'path';
import pixelmatch from 'pixelmatch';
import type { ToolingLog } from '@kbn/tooling-log';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';
import { resizePng } from '@kbn/ftr-common-functional-ui-services';
export interface PngDescriptor {
  path: string;

  /**
   * If a buffer is provided this will avoid the extra step of reading from disk
   */
  buffer?: Buffer;
}

const toDescriptor = (imageInfo: string | PngDescriptor): PngDescriptor => {
  if (typeof imageInfo === 'string') {
    return { path: imageInfo };
  }
  return {
    ...imageInfo,
  };
};

const readPng = async (imageInfo: string | Buffer): Promise<PNG> => {
  const buffer = Buffer.isBuffer(imageInfo) ? imageInfo : await fs.readFile(imageInfo);
  return PNG.sync.read(buffer);
};

/**
 * Comparing pngs and writing result to provided directory
 *
 * @param session
 * @param baseline
 * @param diffPath
 * @param sessionDirectory
 * @param log
 * @returns diffRatio
 */
export async function comparePngs(
  sessionInfo: string | PngDescriptor,
  baselineInfo: string | PngDescriptor,
  diffPath: string,
  sessionDirectory: string,
  log: ToolingLog
) {
  const sessionDescriptor = toDescriptor(sessionInfo);
  const baselineDescriptor = toDescriptor(baselineInfo);

  log.debug(`comparePngs: ${sessionDescriptor.path} vs ${baselineDescriptor.path}`);

  let sessionTestImg = await readPng(sessionDescriptor.buffer ?? sessionDescriptor.path);
  let baselineTestImg = await readPng(baselineDescriptor.buffer ?? baselineDescriptor.path);
  const { width: sessionWidth, height: sessionHeight } = sessionTestImg;
  const { width: baselineWidth, height: baselineHeight } = baselineTestImg;

  // Adjust screenshot size
  const testWidth = Math.min(sessionWidth, baselineWidth);
  const testHeight = Math.min(sessionHeight, baselineHeight);
  log.debug('baseline height ' + baselineHeight + ' and width ' + baselineWidth);
  log.debug('session height ' + sessionHeight + ' and width ' + sessionWidth);
  log.debug('test height ' + testHeight + ' and width ' + testWidth);
  if (sessionWidth !== baselineWidth || sessionHeight !== baselineHeight) {
    sessionTestImg = resizePng(sessionTestImg, testWidth, testHeight);
    baselineTestImg = resizePng(baselineTestImg, testWidth, testHeight);
    await fs.writeFile(
      join(sessionDirectory, `${parse(sessionDescriptor.path).name}-session-resized.png`),
      PNG.sync.write(sessionTestImg)
    );
    await fs.writeFile(
      join(sessionDirectory, `${parse(baselineDescriptor.path).name}-baseline-resized.png`),
      PNG.sync.write(baselineTestImg)
    );
  }

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = 0.1;
  const diff = new PNG({ width: testWidth, height: testHeight });
  const mismatchedPixels = pixelmatch(
    sessionTestImg.data,
    baselineTestImg.data,
    diff.data,
    testWidth,
    testHeight,
    {
      threshold: THRESHOLD,
    }
  );

  const diffRatio = mismatchedPixels / (testWidth * testHeight);

  log.debug(`percent different (ratio): ${diffRatio}`);
  if (diffRatio > 0) {
    const buffer = PNG.sync.write(diff);
    await fs.writeFile(diffPath, buffer);
  }
  return diffRatio;
}
