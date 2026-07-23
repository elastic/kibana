/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateProcStats, type OnCompareCallback, type PairedComparisonStart } from '@kbn/bench';
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
  WARM_START_MEMORY_MATERIALITY_BYTES,
} from './paired_memory_rule';
import {
  getWarmStartMemoryRegressionReportContextFromEnv,
  type WarmStartMemoryRegressionReport,
  writeWarmStartMemoryRegressionReport,
} from './memory_regression_report';

const SETTLING_MS = 30_000;
const TAIL_SAMPLE_COUNT = 8;

const formatBytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;

const getMetric = (start: PairedComparisonStart, metric: string): number | undefined => {
  if (start.result.status !== 'completed') {
    return;
  }
  return aggregateProcStats(start.result.stats)[
    metric as keyof ReturnType<typeof aggregateProcStats>
  ];
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
});

const getPairedMetric = (
  pairs: ReadonlyArray<{ baseline: PairedComparisonStart; target: PairedComparisonStart }>,
  metric: string
): Record<string, unknown> => {
  const values = pairs.flatMap(({ baseline, target }) => {
    const baselineBytes = getMetric(baseline, metric);
    const targetBytes = getMetric(target, metric);
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

export const compareWarmStartMemory: OnCompareCallback = async ({
  left,
  log,
  pairedComparison,
}) => {
  const pairedBenchmark = pairedComparison?.benchmarks.find(
    ({ benchmarkName }) => benchmarkName === WARM_START_BENCHMARK_NAME
  );
  const comparisonRun = left.config.comparisonRun;
  const enforcement = comparisonRun?.enforcement ?? 'observe';
  const validPairs = pairedBenchmark?.validPairs ?? [];
  const heapPairs = getPairedMetric(validPairs, 'tailHeapUsed');
  const heapDeltas = (heapPairs.pairs as Array<{ deltaBytes: number }>).map(
    ({ deltaBytes }) => deltaBytes
  );
  const rule = evaluatePairedMemoryRule({ deltas: heapDeltas });
  const inconclusive = validPairs.length < MIN_VALID_WARM_START_MEMORY_PAIRS;
  const wouldTrigger = !inconclusive && rule.wouldTrigger;
  const outcome = inconclusive ? 'inconclusive' : wouldTrigger ? 'regression' : 'observed';

  const report: WarmStartMemoryRegressionReport = {
    version: 1,
    outcome,
    enforcement,
    context: getWarmStartMemoryRegressionReportContextFromEnv(),
    protocol: {
      monitorIntervalMs: left.config.monitorInterval,
      postReadySettlingMs: SETTLING_MS,
      tailSampleCount: TAIL_SAMPLE_COUNT,
      confidence: WARM_START_MEMORY_CONFIDENCE,
      materialityBytes: WARM_START_MEMORY_MATERIALITY_BYTES,
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
    diagnostics: {
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
      `Warm-start memory comparison inconclusive: ${validPairs.length}/${
        comparisonRun?.pairs ?? 0
      } valid pairs after ${pairedBenchmark?.attemptedPairs ?? 0} attempts. Report: ${reportPath}`
    );
    return;
  }

  log.info(
    `Warm-start paired tail heap: mean delta ${formatBytes(
      rule.meanBytes ?? 0
    )}, 99% LCB ${formatBytes(rule.lowerConfidenceBoundBytes ?? 0)}, materiality ${formatBytes(
      WARM_START_MEMORY_MATERIALITY_BYTES
    )}, wouldTrigger=${wouldTrigger}. Report: ${reportPath}`
  );

  if (wouldTrigger && enforcement === 'fail') {
    throw new Error(`Warm-start memory regression detected. Report: ${reportPath}`);
  }
};
