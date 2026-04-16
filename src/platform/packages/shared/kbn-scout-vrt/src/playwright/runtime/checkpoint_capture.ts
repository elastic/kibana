/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { isUpdateBaselinesEnabled } from './environment';
import {
  getVisualRegressionActualPath,
  getVisualRegressionBaselinePath,
  getVisualRegressionImagePath,
  toRepoRelativePath,
} from './paths';
import { createVisualSnapshotName } from './snapshot_name';
import type {
  VisualCheckpointCaptureOptions,
  VisualCheckpointCaptureResult,
  VisualRegressionContext,
} from './types';
import { waitForVisualStability } from './wait_for_visual_stability';

export const captureVisualCheckpoint = async (
  context: VisualRegressionContext,
  options: VisualCheckpointCaptureOptions
): Promise<VisualCheckpointCaptureResult> => {
  const { page, packageId, runId, testInfo, testKey } = context;
  const snapshotName = createVisualSnapshotName(options.stepIndex, options.stepTitle);
  const actualOutputPath = getVisualRegressionActualPath(runId, packageId, testKey, snapshotName);
  const imagePath = getVisualRegressionImagePath(packageId, testKey, snapshotName);
  const baselineOutputPath = getVisualRegressionBaselinePath(packageId, testKey, snapshotName);

  fs.mkdirSync(path.dirname(actualOutputPath), { recursive: true });

  await waitForVisualStability(page);

  const actualBuffer = await page.screenshot({
    path: actualOutputPath,
    animations: 'disabled',
    caret: 'hide',
    mask: options.mask,
    scale: 'css',
  });

  if (isUpdateBaselinesEnabled()) {
    fs.mkdirSync(path.dirname(baselineOutputPath), { recursive: true });
    fs.writeFileSync(baselineOutputPath, actualBuffer);

    return {
      record: {
        testFile: toRepoRelativePath(testInfo.file),
        testTitle: testInfo.title,
        testKey,
        stepTitle: options.stepTitle,
        stepIndex: options.stepIndex,
        snapshotName,
        status: 'updated',
        imagePath,
        source: options.source,
      },
    };
  }

  return {
    record: {
      testFile: toRepoRelativePath(testInfo.file),
      testTitle: testInfo.title,
      testKey,
      stepTitle: options.stepTitle,
      stepIndex: options.stepIndex,
      snapshotName,
      status: 'captured',
      imagePath,
      source: options.source,
    },
  };
};
