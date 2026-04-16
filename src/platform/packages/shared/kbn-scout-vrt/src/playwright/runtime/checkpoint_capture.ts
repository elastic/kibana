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
import { isCompareBaselinesEnabled, isUpdateBaselinesEnabled } from './environment';
import { compareImages } from './compare_images';
import {
  getVisualRegressionActualPath,
  getVisualRegressionBaselinePath,
  getVisualRegressionDiffImagePath,
  getVisualRegressionDiffPath,
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

const createMissingBaselineError = (imagePath: string): Error =>
  new Error(
    `Missing visual baseline for '${imagePath}'. Run 'node scripts/scout_vrt run-tests ... --update-baselines' to create it.`
  );

const toMismatchPercent = (mismatchRatio: number): number =>
  Math.round(mismatchRatio * 10000) / 100;

export const captureVisualCheckpoint = async (
  context: VisualRegressionContext,
  options: VisualCheckpointCaptureOptions
): Promise<VisualCheckpointCaptureResult> => {
  const { page, packageId, runId, testInfo, testKey } = context;
  const snapshotName = createVisualSnapshotName(options.stepIndex, options.stepTitle);
  const actualOutputPath = getVisualRegressionActualPath(runId, packageId, testKey, snapshotName);
  const imagePath = getVisualRegressionImagePath(packageId, testKey, snapshotName);
  const baselineOutputPath = getVisualRegressionBaselinePath(packageId, testKey, snapshotName);
  const diffOutputPath = getVisualRegressionDiffPath(runId, packageId, testKey, snapshotName);

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

  if (isCompareBaselinesEnabled()) {
    if (!fs.existsSync(baselineOutputPath)) {
      const error = createMissingBaselineError(imagePath);
      process.stderr.write(`[scout-vrt] ${error.message}\n`);

      return {
        record: {
          testFile: toRepoRelativePath(testInfo.file),
          testTitle: testInfo.title,
          testKey,
          stepTitle: options.stepTitle,
          stepIndex: options.stepIndex,
          snapshotName,
          status: 'missing-baseline',
          imagePath,
          source: options.source,
        },
        error,
      };
    }

    const comparison = await compareImages({
      actualBuffer,
      baselineBuffer: fs.readFileSync(baselineOutputPath),
      diffPath: diffOutputPath,
    });

    if (!comparison.dimensionMismatch && comparison.mismatchRatio === 0) {
      return {
        record: {
          testFile: toRepoRelativePath(testInfo.file),
          testTitle: testInfo.title,
          testKey,
          stepTitle: options.stepTitle,
          stepIndex: options.stepIndex,
          snapshotName,
          status: 'passed',
          imagePath,
          source: options.source,
        },
      };
    }

    const dimensionSuffix = comparison.dimensionMismatch
      ? ' Screenshot dimensions changed between baseline and actual.'
      : '';
    const error = new Error(
      `Visual regression mismatch for '${imagePath}' (ratio ${comparison.mismatchRatio}).${dimensionSuffix}`
    );

    return {
      record: {
        testFile: toRepoRelativePath(testInfo.file),
        testTitle: testInfo.title,
        testKey,
        stepTitle: options.stepTitle,
        stepIndex: options.stepIndex,
        snapshotName,
        status: 'failed',
        imagePath,
        diffPath: getVisualRegressionDiffImagePath(packageId, testKey, snapshotName),
        mismatchPercent:
          comparison.mismatchRatio > 0 ? toMismatchPercent(comparison.mismatchRatio) : undefined,
        source: options.source,
      },
      error,
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
