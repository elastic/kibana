/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

import { LATENCY_TRACE } from '../constants';

/**
 * Traces for the latency map: a dense band of transactions around 100ms, so the middle of
 * the map always has cells to click, plus fast and slow outliers that stretch the duration
 * axis over a few decades, and some failures for the failure hue.
 */
export function latencyMapTraces({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({ name: LATENCY_TRACE.SERVICE_NAME, environment: 'production', agentName: 'java' })
    .instance('latency-1');

  const transactionWith = (timestamp: number, durationMs: number, failed = false) => {
    const transaction = instance
      .transaction({ transactionName: LATENCY_TRACE.TRANSACTION_NAME })
      .timestamp(timestamp)
      .duration(durationMs);
    return failed ? transaction.failure() : transaction.success();
  };

  // Around 100ms: a few rows of the log scale, several spans per time column.
  const DENSE_BAND_MS = [60, 80, 100, 130, 170];
  // The decades that give the map its height, 10ms to 1.5s.
  const SPREAD_MS = [10, 30, 300, 900, 1500];

  const denseBand = Array.from(
    timerange(from, to)
      .interval('1s')
      .rate(DENSE_BAND_MS.length)
      .generator((timestamp, index) =>
        transactionWith(timestamp, DENSE_BAND_MS[index % DENSE_BAND_MS.length])
      )
  );

  const spread = Array.from(
    timerange(from, to)
      .interval('5s')
      .rate(SPREAD_MS.length)
      .generator((timestamp, index) =>
        transactionWith(timestamp, SPREAD_MS[index % SPREAD_MS.length])
      )
  );

  const failures = Array.from(
    timerange(from, to)
      .interval('5s')
      .rate(1)
      .generator((timestamp) => transactionWith(timestamp, 400, true))
  );

  const allEvents = [...denseBand, ...spread, ...failures];

  function* generator(): SynthtraceGenerator<ApmFields> {
    yield* allEvents;
  }

  return generator();
}
