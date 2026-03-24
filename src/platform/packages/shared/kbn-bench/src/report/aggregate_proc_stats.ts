/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { last, mean, sumBy } from 'lodash';
import type { ProcStats, ProcStatSample, RunProcStats } from '../runner/monitor/types';

/**
 * Aggregate samples for single process
 */
export function aggregateProcStatSamples(samples: ProcStatSample[]): ProcStats {
  // all metrics are cumulative, except for heap usage
  const aggregated = last(samples)!;

  aggregated.heapUsage = mean(samples.map((sample) => sample.heapUsage));
  return aggregated;
}

/**
 * Aggregate proc stats for run, by summing the stats per process
 */
export function aggregateProcStats(stats: ProcStats[]): RunProcStats {
  return {
    gcIncremental: sumBy(stats, (stat) => stat.gcIncremental),
    gcWeakCb: sumBy(stats, (stat) => stat.gcWeakCb),
    gcMinor: sumBy(stats, (stat) => stat.gcMinor),
    gcMajor: sumBy(stats, (stat) => stat.gcMajor),
    gcTotal: sumBy(stats, (stat) => stat.gcTotal),
    cpuUsage: sumBy(stats, (stat) => stat.cpuUsage),
    rssMax: sumBy(stats, (stat) => stat.rssMax),
  };
}
