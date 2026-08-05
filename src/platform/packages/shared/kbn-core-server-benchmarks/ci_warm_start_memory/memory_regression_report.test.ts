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
import {
  getWarmStartMemoryRegressionReportContextFromEnv,
  type WarmStartMemoryRegressionReport,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const report: WarmStartMemoryRegressionReport = {
  version: 2,
  outcome: 'inconclusive',
  protocol: {
    monitorIntervalMs: 250,
    postReadySettlingMs: 30_000,
    tailSampleCount: 8,
    forcedGcTimeoutMs: 30_000,
    confidence: 0.99,
    thresholdBytes: 5 * 1024 * 1024,
  },
  comparison: {
    seed: 'test',
    requestedPairs: 8,
    attemptedPairs: 1,
    validPairs: 0,
    order: ['baseline-target'],
  },
  starts: [{ attempt: 0, side: 'baseline', status: 'failed' }],
  pairs: [],
  tailHeapUsed: { pairCount: 0 },
  postForcedGcHeapUsed: { pairCount: 0 },
  diagnostics: {},
};

describe('warm-start memory report', () => {
  it('writes an inconclusive report, including raw comparison protocol', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'warm-start-memory-report-'));
    const reportPath = path.join(tempDir, 'report.json');

    try {
      await writeWarmStartMemoryRegressionReport(report, reportPath);
      expect(JSON.parse(await readFile(reportPath, 'utf8'))).toEqual(report);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('collects artifact context from CI environment', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, GITHUB_PR_MERGE_BASE: 'baseline', BUILDKITE_COMMIT: 'target' };

    try {
      expect(getWarmStartMemoryRegressionReportContextFromEnv()).toEqual({
        baselineCommit: 'baseline',
        targetCommit: 'target',
      });
    } finally {
      process.env = originalEnv;
    }
  });
});
