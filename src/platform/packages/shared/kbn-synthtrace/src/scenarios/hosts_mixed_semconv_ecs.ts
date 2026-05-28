/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Deterministic mixed fleet: odd host indices emit semconv OTel metrics, even
 * indices emit ECS Metricbeat-system metrics.
 *
 * Run:
 *   node scripts/synthtrace hosts_mixed_semconv_ecs --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  configureTsdsOtelTemplate,
  formatHostName,
  generateEcsHostMetricsAtTimestamp,
  generateSemconvHostMetricsAtTimestamp,
  getHostCount,
} from './helpers/hosts_benchmark';

const SCENARIO_NAME = 'hosts_mixed_semconv_ecs';

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts, from, to }) => {
  const numHosts = getHostCount(scenarioOpts);

  return {
    bootstrap: async ({ infraEsClient }) => {
      configureTsdsOtelTemplate(infraEsClient, from, to);
    },
    generate: ({ range, clients: { infraEsClient } }) => {
      const semconvMetrics = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) =>
          times(numHosts)
            .filter((hostIndex) => hostIndex % 2 === 1)
            .flatMap((hostIndex) =>
              generateSemconvHostMetricsAtTimestamp(
                SCENARIO_NAME,
                hostIndex,
                formatHostName(hostIndex),
                timestamp,
                { staggerMs: true }
              )
            )
        );

      const ecsMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          times(numHosts)
            .filter((hostIndex) => hostIndex % 2 === 0)
            .flatMap((hostIndex) =>
              generateEcsHostMetricsAtTimestamp(SCENARIO_NAME, hostIndex, timestamp)
            )
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_mixed_semconv_hosts', () => semconvMetrics)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_mixed_ecs_hosts', () => ecsMetrics)
        ),
      ];
    },
  };
};

export default scenario;
