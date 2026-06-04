/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnCompareCallback } from '@kbn/bench';
import { getMedianMaxRssBytes, getMedianTailRssBytes } from './median_max_rss';
import {
  getAllowedRegressionDeltaBytes,
  isMemoryRegression,
  MAX_RSS_REGRESSION_THRESHOLD_POLICY,
  TAIL_RSS_REGRESSION_THRESHOLD_POLICY,
} from './memory_regression_threshold';
import {
  buildWarmStartMemoryRegressionReport,
  getWarmStartMemoryRegressionReportContextFromEnv,
  type WarmStartMemoryRegressionMetricName,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const formatBytes = (bytes: number): string => {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
};

export const compareWarmStartMemory: OnCompareCallback = async ({ leftSummary, rightSummary }) => {
  const baselineMedianTailRssBytes = getMedianTailRssBytes(leftSummary);
  const targetMedianTailRssBytes = getMedianTailRssBytes(rightSummary);
  const baselineMedianMaxRssBytes = getMedianMaxRssBytes(leftSummary);
  const targetMedianMaxRssBytes = getMedianMaxRssBytes(rightSummary);

  const allowedTailRssDeltaBytes = getAllowedRegressionDeltaBytes(
    baselineMedianTailRssBytes,
    TAIL_RSS_REGRESSION_THRESHOLD_POLICY
  );
  const allowedMaxRssDeltaBytes = getAllowedRegressionDeltaBytes(
    baselineMedianMaxRssBytes,
    MAX_RSS_REGRESSION_THRESHOLD_POLICY
  );
  const tailRssRegressed = isMemoryRegression(
    baselineMedianTailRssBytes,
    targetMedianTailRssBytes,
    TAIL_RSS_REGRESSION_THRESHOLD_POLICY
  );
  const maxRssRegressed = isMemoryRegression(
    baselineMedianMaxRssBytes,
    targetMedianMaxRssBytes,
    MAX_RSS_REGRESSION_THRESHOLD_POLICY
  );

  const triggeredMetrics: WarmStartMemoryRegressionMetricName[] = [
    ...(tailRssRegressed ? (['tailRss'] as const) : []),
    ...(maxRssRegressed ? (['maxRss'] as const) : []),
  ];

  if (!triggeredMetrics.length) {
    return;
  }

  const report = buildWarmStartMemoryRegressionReport({
    metrics: {
      tailRss: {
        baselineRssBytes: baselineMedianTailRssBytes,
        targetRssBytes: targetMedianTailRssBytes,
        allowedDeltaBytes: allowedTailRssDeltaBytes,
        regressed: tailRssRegressed,
      },
      maxRss: {
        baselineRssBytes: baselineMedianMaxRssBytes,
        targetRssBytes: targetMedianMaxRssBytes,
        allowedDeltaBytes: allowedMaxRssDeltaBytes,
        regressed: maxRssRegressed,
      },
    },
    triggeredMetrics,
    context: getWarmStartMemoryRegressionReportContextFromEnv(),
  });

  const reportPath = await writeWarmStartMemoryRegressionReport(report);

  throw new Error(
    [
      'Warm-start memory regression detected.',
      `Triggered metric(s): ${triggeredMetrics.join(', ')}`,
      `Tail RSS baseline: ${formatBytes(baselineMedianTailRssBytes)}`,
      `Tail RSS target: ${formatBytes(targetMedianTailRssBytes)}`,
      `Tail RSS delta: ${formatBytes(
        targetMedianTailRssBytes - baselineMedianTailRssBytes
      )} (allowed: ${formatBytes(allowedTailRssDeltaBytes)})`,
      `Max RSS baseline: ${formatBytes(baselineMedianMaxRssBytes)}`,
      `Max RSS target: ${formatBytes(targetMedianMaxRssBytes)}`,
      `Max RSS delta: ${formatBytes(
        targetMedianMaxRssBytes - baselineMedianMaxRssBytes
      )} (allowed: ${formatBytes(allowedMaxRssDeltaBytes)})`,
      `Report: ${reportPath}`,
    ].join(' ')
  );
};
