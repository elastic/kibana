/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  aggregateForcedGcHeapStats,
  aggregateProcStats,
  type OnCompareCallback,
  type PairedComparisonStart,
} from '@kbn/bench';
import {
  MAX_RSS_METRIC_KEY,
  TAIL_ARRAY_BUFFERS_METRIC_KEY,
  TAIL_EXTERNAL_MEMORY_METRIC_KEY,
  TAIL_HEAP_TOTAL_METRIC_KEY,
  TAIL_RSS_METRIC_KEY,
  WARM_START_BENCHMARK_NAME,
} from './median_max_rss';
import {
  evaluatePairedMemoryRule,
  MIN_VALID_WARM_START_MEMORY_PAIRS,
  WARM_START_MEMORY_CONFIDENCE,
  WARM_START_MEMORY_THRESHOLD_BYTES,
} from './paired_memory_rule';
import {
  getWarmStartMemoryRegressionReportContextFromEnv,
  type WarmStartMemoryRegressionReport,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const SETTLING_MS = 30_000;
const TAIL_SAMPLE_COUNT = 8;
const FORCED_GC_TIMEOUT_MS = 30_000;

const formatBytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;

const getMetric = (start: PairedComparisonStart, metric: string): number | undefined => {
  if (start.result.status !== 'completed') {
    return;
  }
  return aggregateProcStats(start.result.stats)[
    metric as keyof ReturnType<typeof aggregateProcStats>
  ];
};

const getForcedGcMetric = (start: PairedComparisonStart, metric: string): number | undefined => {
  if (start.result.status !== 'completed' || !start.result.forcedGcHeapStats) {
    return;
  }
  const aggregated = aggregateForcedGcHeapStats(start.result.forcedGcHeapStats);
  if (
    metric !== 'postForcedGcHeapUsed' &&
    metric !== 'forcedGcHeapReduction' &&
    metric !== 'forcedGcDurationMs'
  ) {
    return;
  }
  return aggregated?.[metric];
};

const toStartRecord = (start: PairedComparisonStart): Record<string, unknown> => ({
  attempt: start.attempt,
  pair: start.pair,
  side: start.side,
  orderPosition: start.orderPosition,
  status: start.result.status,
  durationMs: start.result.status === 'completed' ? start.result.time : undefined,
  failureReason: start.result.status === 'failed' ? start.result.error.message : undefined,
  metrics: start.result.status === 'completed' ? aggregateProcStats(start.result.stats) : undefined,
  samples: start.result.samples,
  forcedGcHeapStats: start.result.forcedGcHeapStats,
});

const getPairedMetric = (
  pairs: ReadonlyArray<{ baseline: PairedComparisonStart; target: PairedComparisonStart }>,
  metric: string,
  getStartMetric: (start: PairedComparisonStart, metric: string) => number | undefined = getMetric
): Record<string, unknown> => {
  const values = pairs.flatMap(({ baseline, target }) => {
    const baselineBytes = getStartMetric(baseline, metric);
    const targetBytes = getStartMetric(target, metric);
    return baselineBytes === undefined || targetBytes === undefined
      ? []
      : [{ baselineBytes, targetBytes, deltaBytes: targetBytes - baselineBytes }];
  });
  return {
    pairs: values,
    baselineMeanBytes:
      values.length > 0
        ? values.reduce((sum, value) => sum + value.baselineBytes, 0) / values.length
        : undefined,
    targetMeanBytes:
      values.length > 0
        ? values.reduce((sum, value) => sum + value.targetBytes, 0) / values.length
        : undefined,
  };
};

const getPairedDuration = (
  pairs: ReadonlyArray<{ baseline: PairedComparisonStart; target: PairedComparisonStart }>
): Record<string, unknown> => {
  const values = pairs.flatMap(({ baseline, target }) => {
    const baselineMs = getForcedGcMetric(baseline, 'forcedGcDurationMs');
    const targetMs = getForcedGcMetric(target, 'forcedGcDurationMs');
    return baselineMs === undefined || targetMs === undefined
      ? []
      : [{ baselineMs, targetMs, deltaMs: targetMs - baselineMs }];
  });
  return {
    pairs: values,
    baselineMeanMs:
      values.length > 0
        ? values.reduce((sum, value) => sum + value.baselineMs, 0) / values.length
        : undefined,
    targetMeanMs:
      values.length > 0
        ? values.reduce((sum, value) => sum + value.targetMs, 0) / values.length
        : undefined,
  };
};

export const compareWarmStartMemory: OnCompareCallback = async ({
  left,
  log,
  pairedComparison,
}) => {
  const pairedBenchmark = pairedComparison?.benchmarks.find(
    ({ benchmarkName }) => benchmarkName === WARM_START_BENCHMARK_NAME
  );
  const comparisonRun = left.config.comparisonRun;
  const validPairs = pairedBenchmark?.validPairs ?? [];
  const heapPairs = getPairedMetric(validPairs, 'tailHeapUsed');
  const heapDeltas = (heapPairs.pairs as Array<{ deltaBytes: number }>).map(
    ({ deltaBytes }) => deltaBytes
  );
  const rule = evaluatePairedMemoryRule({ deltas: heapDeltas });
  const postForcedGcHeapPairs = getPairedMetric(
    validPairs,
    'postForcedGcHeapUsed',
    getForcedGcMetric
  );
  const postForcedGcHeapRule = evaluatePairedMemoryRule({
    deltas: (postForcedGcHeapPairs.pairs as Array<{ deltaBytes: number }>).map(
      ({ deltaBytes }) => deltaBytes
    ),
  });
  const inconclusive = postForcedGcHeapRule.pairCount < MIN_VALID_WARM_START_MEMORY_PAIRS;
  const regression =
    !inconclusive &&
    (postForcedGcHeapRule.lowerConfidenceBoundBytes ?? Number.NEGATIVE_INFINITY) >
      WARM_START_MEMORY_THRESHOLD_BYTES;
  const outcome = inconclusive ? 'inconclusive' : regression ? 'regression' : 'observed';

  const report: WarmStartMemoryRegressionReport = {
    version: 2,
    outcome,
    context: getWarmStartMemoryRegressionReportContextFromEnv(),
    protocol: {
      monitorIntervalMs: left.config.monitorInterval,
      postReadySettlingMs: SETTLING_MS,
      tailSampleCount: TAIL_SAMPLE_COUNT,
      forcedGcTimeoutMs: FORCED_GC_TIMEOUT_MS,
      confidence: WARM_START_MEMORY_CONFIDENCE,
      thresholdBytes: WARM_START_MEMORY_THRESHOLD_BYTES,
    },
    comparison: {
      baselineIdentity: pairedComparison?.baselineIdentity,
      targetIdentity: pairedComparison?.targetIdentity,
      seed: pairedComparison?.seed,
      requestedPairs: pairedBenchmark?.requestedPairs ?? comparisonRun?.pairs ?? 0,
      attemptedPairs: pairedBenchmark?.attemptedPairs ?? 0,
      validPairs: validPairs.length,
      order: pairedBenchmark?.order ?? [],
    },
    starts: (pairedBenchmark?.starts ?? []).map(toStartRecord),
    pairs: heapPairs.pairs as Record<string, unknown>[],
    tailHeapUsed: { ...heapPairs, ...rule },
    postForcedGcHeapUsed: { ...postForcedGcHeapPairs, ...postForcedGcHeapRule },
    diagnostics: {
      forcedGcHeapReduction: getPairedMetric(
        validPairs,
        'forcedGcHeapReduction',
        getForcedGcMetric
      ),
      forcedGcDurationMs: getPairedDuration(validPairs),
      [TAIL_RSS_METRIC_KEY]: getPairedMetric(validPairs, 'tailRss'),
      [MAX_RSS_METRIC_KEY]: getPairedMetric(validPairs, 'rssMax'),
      [TAIL_HEAP_TOTAL_METRIC_KEY]: getPairedMetric(validPairs, 'tailHeapTotal'),
      [TAIL_EXTERNAL_MEMORY_METRIC_KEY]: getPairedMetric(validPairs, 'tailExternal'),
      [TAIL_ARRAY_BUFFERS_METRIC_KEY]: getPairedMetric(validPairs, 'tailArrayBuffers'),
    },
  };
  const reportPath = await writeWarmStartMemoryRegressionReport(report);

  if (inconclusive) {
    log.warning(
      `Warm-start memory comparison inconclusive: ${postForcedGcHeapRule.pairCount}/${
        comparisonRun?.pairs ?? 0
      } valid post-forced-GC pairs after ${
        pairedBenchmark?.attemptedPairs ?? 0
      } attempts. Report: ${reportPath}`
    );
    return;
  }

  log.info(
    `Warm-start paired heap growth: ${formatBytes(
      postForcedGcHeapRule.lowerConfidenceBoundBytes ?? 0
    )} 99% LCB; ${formatBytes(WARM_START_MEMORY_THRESHOLD_BYTES)} threshold ${
      regression ? 'exceeded' : 'not exceeded'
    }.\n\nWarm-start paired heap results:\npost-forced-GC 99% LCB: ${formatBytes(
      postForcedGcHeapRule.lowerConfidenceBoundBytes ?? 0
    )}\npost-forced-GC mean: ${formatBytes(
      postForcedGcHeapRule.meanBytes ?? 0
    )}\nnatural 99% LCB: ${formatBytes(
      rule.lowerConfidenceBoundBytes ?? 0
    )}\nnatural mean: ${formatBytes(rule.meanBytes ?? 0)}\nReport: ${reportPath}`
  );

  if (regression) {
    throw new Error(`Warm-start memory regression detected. Report: ${reportPath}`);
  }
};
