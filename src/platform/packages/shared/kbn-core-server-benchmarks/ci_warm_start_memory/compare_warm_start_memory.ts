/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnCompareCallback } from '@kbn/bench';
import {
  getMedianMaxRssBytes,
  getMedianTailRssBytes,
  getOptionalMedianMemoryMetricBytes,
  TAIL_ARRAY_BUFFERS_METRIC_KEY,
  TAIL_EXTERNAL_MEMORY_METRIC_KEY,
  TAIL_HEAP_TOTAL_METRIC_KEY,
  TAIL_HEAP_USED_METRIC_KEY,
} from './median_max_rss';
import {
  getAllowedRegressionDeltaBytes,
  isMemoryRegression,
  MAX_RSS_REGRESSION_THRESHOLD_POLICY,
  TAIL_HEAP_USED_REGRESSION_THRESHOLD_POLICY,
  TAIL_RSS_REGRESSION_THRESHOLD_POLICY,
} from './memory_regression_threshold';
import {
  buildWarmStartMemoryRegressionReport,
  getWarmStartMemoryRegressionReportContextFromEnv,
  type WarmStartMemoryRegressionMetricName,
  type WarmStartMemoryRegressionReport,
  type WarmStartMemoryDiagnosticMetricName,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const formatBytes = (bytes: number): string => {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
};

const DIAGNOSTIC_METRICS: Array<{
  readonly name: WarmStartMemoryDiagnosticMetricName;
  readonly metricKey: string;
}> = [
  { name: 'tailHeapTotal', metricKey: TAIL_HEAP_TOTAL_METRIC_KEY },
  { name: 'tailExternal', metricKey: TAIL_EXTERNAL_MEMORY_METRIC_KEY },
  { name: 'tailArrayBuffers', metricKey: TAIL_ARRAY_BUFFERS_METRIC_KEY },
];

const REGRESSION_METRIC_LABELS: Record<WarmStartMemoryRegressionMetricName, string> = {
  tailRss: 'Tail RSS',
  maxRss: 'Max RSS',
  tailHeapUsed: 'Tail heap used',
};

const getRegressionMetricEntries = (
  report: WarmStartMemoryRegressionReport
): Array<
  [
    WarmStartMemoryRegressionMetricName,
    NonNullable<WarmStartMemoryRegressionReport['metrics'][WarmStartMemoryRegressionMetricName]>
  ]
> => {
  return [
    ['tailRss', report.metrics.tailRss],
    ['maxRss', report.metrics.maxRss],
    ...(report.metrics.tailHeapUsed
      ? ([['tailHeapUsed', report.metrics.tailHeapUsed]] as Array<
          [
            WarmStartMemoryRegressionMetricName,
            NonNullable<
              WarmStartMemoryRegressionReport['metrics'][WarmStartMemoryRegressionMetricName]
            >
          ]
        >)
      : []),
  ];
};

const formatRegressionMetricForError = (
  metricName: WarmStartMemoryRegressionMetricName,
  metric: NonNullable<
    WarmStartMemoryRegressionReport['metrics'][WarmStartMemoryRegressionMetricName]
  >
): string => {
  return `${REGRESSION_METRIC_LABELS[metricName]} delta: ${formatBytes(
    metric.deltaBytes
  )} (baseline: ${formatBytes(metric.baselineBytes)}, target: ${formatBytes(
    metric.targetBytes
  )}, allowed: ${formatBytes(metric.allowedDeltaBytes)})`;
};

const buildRegressionErrorMessage = (
  report: WarmStartMemoryRegressionReport,
  reportPath: string
): string => {
  const metricEntries = getRegressionMetricEntries(report);
  const triggeredMetricEntries = metricEntries.filter(([metricName]) => {
    return report.triggeredMetrics.includes(metricName);
  });
  const contextMetricEntries = metricEntries.filter(([metricName]) => {
    return !report.triggeredMetrics.includes(metricName);
  });

  return [
    'Warm-start memory regression detected.',
    `Threshold failure(s): ${triggeredMetricEntries
      .map(([metricName, metric]) => formatRegressionMetricForError(metricName, metric))
      .join('; ')}`,
    ...(contextMetricEntries.length
      ? [
          `Metric context: ${contextMetricEntries
            .map(([metricName, metric]) => formatRegressionMetricForError(metricName, metric))
            .join('; ')}`,
        ]
      : []),
    `Triggered metric(s): ${report.triggeredMetrics.join(', ')}`,
    `Report: ${reportPath}`,
  ].join(' ');
};

export const compareWarmStartMemory: OnCompareCallback = async ({ leftSummary, rightSummary }) => {
  const baselineMedianTailRssBytes = getMedianTailRssBytes(leftSummary);
  const targetMedianTailRssBytes = getMedianTailRssBytes(rightSummary);
  const baselineMedianMaxRssBytes = getMedianMaxRssBytes(leftSummary);
  const targetMedianMaxRssBytes = getMedianMaxRssBytes(rightSummary);
  const baselineMedianTailHeapUsedBytes = getOptionalMedianMemoryMetricBytes(
    leftSummary,
    TAIL_HEAP_USED_METRIC_KEY
  );
  const targetMedianTailHeapUsedBytes = getOptionalMedianMemoryMetricBytes(
    rightSummary,
    TAIL_HEAP_USED_METRIC_KEY
  );

  const allowedTailRssDeltaBytes = getAllowedRegressionDeltaBytes(
    baselineMedianTailRssBytes,
    TAIL_RSS_REGRESSION_THRESHOLD_POLICY
  );
  const allowedMaxRssDeltaBytes = getAllowedRegressionDeltaBytes(
    baselineMedianMaxRssBytes,
    MAX_RSS_REGRESSION_THRESHOLD_POLICY
  );
  const allowedTailHeapUsedDeltaBytes =
    baselineMedianTailHeapUsedBytes !== undefined
      ? getAllowedRegressionDeltaBytes(
          baselineMedianTailHeapUsedBytes,
          TAIL_HEAP_USED_REGRESSION_THRESHOLD_POLICY
        )
      : undefined;
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
  const tailHeapUsedRegressed =
    baselineMedianTailHeapUsedBytes !== undefined && targetMedianTailHeapUsedBytes !== undefined
      ? isMemoryRegression(
          baselineMedianTailHeapUsedBytes,
          targetMedianTailHeapUsedBytes,
          TAIL_HEAP_USED_REGRESSION_THRESHOLD_POLICY
        )
      : false;

  const triggeredMetrics: WarmStartMemoryRegressionMetricName[] = [
    ...(tailRssRegressed ? (['tailRss'] as const) : []),
    ...(maxRssRegressed ? (['maxRss'] as const) : []),
    ...(tailHeapUsedRegressed ? (['tailHeapUsed'] as const) : []),
  ];

  if (!triggeredMetrics.length) {
    return;
  }

  const diagnosticMetrics = Object.fromEntries(
    DIAGNOSTIC_METRICS.flatMap(({ name, metricKey }) => {
      const baselineBytes = getOptionalMedianMemoryMetricBytes(leftSummary, metricKey);
      const targetBytes = getOptionalMedianMemoryMetricBytes(rightSummary, metricKey);

      if (baselineBytes === undefined || targetBytes === undefined) {
        return [];
      }

      return [[name, { baselineBytes, targetBytes }]];
    })
  );

  const report = buildWarmStartMemoryRegressionReport({
    metrics: {
      tailRss: {
        baselineBytes: baselineMedianTailRssBytes,
        targetBytes: targetMedianTailRssBytes,
        allowedDeltaBytes: allowedTailRssDeltaBytes,
        regressed: tailRssRegressed,
      },
      maxRss: {
        baselineBytes: baselineMedianMaxRssBytes,
        targetBytes: targetMedianMaxRssBytes,
        allowedDeltaBytes: allowedMaxRssDeltaBytes,
        regressed: maxRssRegressed,
      },
      ...(baselineMedianTailHeapUsedBytes !== undefined &&
      targetMedianTailHeapUsedBytes !== undefined &&
      allowedTailHeapUsedDeltaBytes !== undefined
        ? {
            tailHeapUsed: {
              baselineBytes: baselineMedianTailHeapUsedBytes,
              targetBytes: targetMedianTailHeapUsedBytes,
              allowedDeltaBytes: allowedTailHeapUsedDeltaBytes,
              regressed: tailHeapUsedRegressed,
            },
          }
        : {}),
    },
    diagnosticMetrics,
    triggeredMetrics,
    context: getWarmStartMemoryRegressionReportContextFromEnv(),
  });

  const reportPath = await writeWarmStartMemoryRegressionReport(report);

  throw new Error(buildRegressionErrorMessage(report, reportPath));
};
