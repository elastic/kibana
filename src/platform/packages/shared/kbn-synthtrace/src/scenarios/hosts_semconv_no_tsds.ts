/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Same semconv document shape and host naming as `hosts_semconv_tsds.ts`, but
 * registers a non-TSDS index template (`index.mode` omitted) for the same
 * `metrics-hostmetricsreceiver.otel-*` data stream. Use this scenario to
 * benchmark the Hosts UI DSL fallback path without TSDS / ES|QL `TS` support.
 *
 * Run:
 *   node scripts/synthtrace hosts_semconv_no_tsds --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  configureNonTsdsOtelTemplate,
  formatHostName,
  generateSemconvHostMetricsAtTimestamp,
  getHostCount,
  BENCH_SEMCONV_INTERVAL,
} from './helpers/hosts_benchmark';

const SCENARIO_NAME = 'hosts_semconv_no_tsds';

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numHosts = getHostCount(scenarioOpts);

  return {
    bootstrap: async ({ infraEsClient }) => {
      configureNonTsdsOtelTemplate(infraEsClient);
    },
    generate: ({ range, clients: { infraEsClient } }) => {
      // See hosts_semconv_tsds.ts for the worker-isolation rationale; here we
      // reconfigure to keep the non-TSDS template shape on the worker.
      configureNonTsdsOtelTemplate(infraEsClient);

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
              timestamp
            )
          )
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_hosts_semconv_no_tsds', () => metrics)
      );
    },
  };
};

export default scenario;
