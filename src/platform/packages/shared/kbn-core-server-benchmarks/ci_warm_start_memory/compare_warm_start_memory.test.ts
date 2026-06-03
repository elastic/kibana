/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { compareWarmStartMemory } from './compare_warm_start_memory';
import { MIN_REGRESSION_DELTA_BYTES } from './memory_regression_threshold';
import { WARM_START_MEMORY_REPORT_PATH_ENV } from './memory_regression_report';
import { makeWarmStartMemoryCompareContext } from './test_helpers';

describe('compareWarmStartMemory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not throw when the target median is within the allowed regression threshold', async () => {
    const baselineMedianRssBytes = 500 * 1024 * 1024;
    const targetMedianRssBytes = baselineMedianRssBytes + MIN_REGRESSION_DELTA_BYTES;

    const context = makeWarmStartMemoryCompareContext({
      baselineMaxRssValues: [
        baselineMedianRssBytes,
        baselineMedianRssBytes,
        baselineMedianRssBytes,
      ],
      targetMaxRssValues: [targetMedianRssBytes, targetMedianRssBytes, targetMedianRssBytes],
    });

    await expect(compareWarmStartMemory(context)).resolves.toBeUndefined();
  });

  it('throws and writes a structured report when the regression exceeds the threshold', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'warm-start-memory-compare-'));
    const reportPath = path.join(tempDir, 'report.json');
    const baselineMedianRssBytes = 500 * 1024 * 1024;
    const targetMedianRssBytes = baselineMedianRssBytes + MIN_REGRESSION_DELTA_BYTES + 1;

    process.env[WARM_START_MEMORY_REPORT_PATH_ENV] = reportPath;
    process.env.GITHUB_PR_MERGE_BASE = 'baseline-sha';
    process.env.BUILDKITE_COMMIT = 'target-sha';

    const context = makeWarmStartMemoryCompareContext({
      baselineMaxRssValues: [
        baselineMedianRssBytes,
        baselineMedianRssBytes,
        baselineMedianRssBytes,
      ],
      targetMaxRssValues: [targetMedianRssBytes, targetMedianRssBytes, targetMedianRssBytes],
    });

    try {
      await expect(compareWarmStartMemory(context)).rejects.toThrow(
        'Warm-start memory regression detected'
      );

      const writtenReport = JSON.parse(await readFile(reportPath, 'utf8'));

      expect(writtenReport).toEqual({
        baselineRssBytes: baselineMedianRssBytes,
        targetRssBytes: targetMedianRssBytes,
        deltaBytes: MIN_REGRESSION_DELTA_BYTES + 1,
        allowedDeltaBytes: MIN_REGRESSION_DELTA_BYTES,
        context: {
          baselineCommit: 'baseline-sha',
          targetCommit: 'target-sha',
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
