/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Deterministic ECS / Metricbeat-system fleet for the Hosts UI benchmark matrix.
 *
 * Run:
 *   node scripts/synthtrace hosts_ecs_only --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  BENCH_ECS_INTERVAL,
  generateEcsHostMetricsAtTimestamp,
  getHostCount,
} from './helpers/hosts_benchmark';

const SCENARIO_NAME = 'hosts_ecs_only';

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numHosts = getHostCount(scenarioOpts);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      // Bench-friendly interval — see helpers/hosts_benchmark.ts.
      // (Metricbeat-system collects every 10s in production; we
      // coarsen here for the bench fixture.)
      const metrics = range
        .interval(BENCH_ECS_INTERVAL)
        .rate(1)
        .generator((timestamp) =>
          times(numHosts).flatMap((hostIndex) =>
            generateEcsHostMetricsAtTimestamp(SCENARIO_NAME, hostIndex, timestamp)
          )
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_hosts_ecs_only', () => metrics)
      );
    },
  };
};

export default scenario;
