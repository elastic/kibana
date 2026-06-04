/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnCompareCallback } from '@kbn/bench';
import { getMedianMaxRssBytes } from './median_max_rss';
import { getAllowedRegressionDeltaBytes, isMemoryRegression } from './memory_regression_threshold';
import {
  buildWarmStartMemoryRegressionReport,
  getWarmStartMemoryRegressionReportContextFromEnv,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const formatBytes = (bytes: number): string => {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
};

export const compareWarmStartMemory: OnCompareCallback = async ({ leftSummary, rightSummary }) => {
  const baselineMedianRssBytes = getMedianMaxRssBytes(leftSummary);
  const targetMedianRssBytes = getMedianMaxRssBytes(rightSummary);

  if (!isMemoryRegression(baselineMedianRssBytes, targetMedianRssBytes)) {
    return;
  }

  const allowedDeltaBytes = getAllowedRegressionDeltaBytes(baselineMedianRssBytes);
  const report = buildWarmStartMemoryRegressionReport({
    baselineRssBytes: baselineMedianRssBytes,
    targetRssBytes: targetMedianRssBytes,
    allowedDeltaBytes,
    context: getWarmStartMemoryRegressionReportContextFromEnv(),
  });

  const reportPath = await writeWarmStartMemoryRegressionReport(report);

  const deltaBytes = targetMedianRssBytes - baselineMedianRssBytes;

  throw new Error(
    [
      'Warm-start memory regression detected.',
      `Baseline median Max RSS: ${formatBytes(baselineMedianRssBytes)}`,
      `Target median Max RSS: ${formatBytes(targetMedianRssBytes)}`,
      `Delta: ${formatBytes(deltaBytes)} (allowed: ${formatBytes(allowedDeltaBytes)})`,
      `Report: ${reportPath}`,
    ].join(' ')
  );
};
