/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Deterministic semconv-only fleet writing to TSDS-backed
 * `metrics-hostmetricsreceiver.otel-*` indices.
 *
 * Run:
 *   node scripts/synthtrace hosts_semconv_tsds --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  BENCH_SEMCONV_INTERVAL,
  configureTsdsOtelTemplate,
  formatHostName,
  generateSemconvHostMetricsAtTimestamp,
  getHostCount,
} from './helpers/hosts_benchmark';

const SCENARIO_NAME = 'hosts_semconv_tsds';

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts, from, to }) => {
  const numHosts = getHostCount(scenarioOpts);

  return {
    bootstrap: async ({ infraEsClient }) => {
      configureTsdsOtelTemplate(infraEsClient, from, to);
    },
    generate: ({ range, clients: { infraEsClient } }) => {
      // `generate` runs on a worker thread with a *different* client instance,
      // so the bootstrap-side template options don't reach it. Re-configure
      // here so the worker PUTs the template with the right look-back window
      // (otherwise the TSDS rejects backdated docs).
      configureTsdsOtelTemplate(infraEsClient, from, to);

      // Bench-friendly interval — see helpers/hosts_benchmark.ts.
      const metrics = range
        .interval(BENCH_SEMCONV_INTERVAL)
        .rate(1)
        .generator((timestamp) =>
          times(numHosts).flatMap((hostIndex) =>
            generateSemconvHostMetricsAtTimestamp(
              SCENARIO_NAME,
              hostIndex,
              formatHostName(hostIndex),
              timestamp,
              { staggerMs: true }
            )
          )
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_hosts_semconv_tsds', () => metrics)
      );
    },
  };
};

export default scenario;
