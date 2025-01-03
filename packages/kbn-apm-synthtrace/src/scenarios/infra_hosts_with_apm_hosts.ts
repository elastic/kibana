/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InfraDocument, apm, Instance, infra, ApmFields } from '@kbn/apm-synthtrace-client';
import { random, times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<InfraDocument | ApmFields> = async ({
  logger,
  scenarioOpts = { numInstances: 10 },
}) => {
  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      const { numInstances } = scenarioOpts;
      const transactionName = 'GET /host/{id}';

      // Only half of the hosts will have system metrics
      const hostList = times(numInstances / 2).map((index) => infra.host(`host-${index}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hostList.flatMap((host) => [
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      // APM Simple Trace
      const instances = times(numInstances).map((index) => {
        return apm
          .service({
            name: `synth-node-${index % 3}`,
            environment: ENVIRONMENT,
            agentName: 'node-js',
          })
          .instance(`host-${index}`);
      });

      const instanceSpans = (instance: Instance) => {
        const hasHighDuration = Math.random() > 0.5;
        const throughput = random(1, 10);

        const traces = range.ratePerMinute(throughput).generator((timestamp) => {
          const parentDuration = hasHighDuration ? random(1000, 5000) : random(100, 1000);
          return instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(parentDuration)
            .success();
        });

        const cpuPct = random(0, 1);
        const memoryFree = random(0, 1000);
        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': memoryFree,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': cpuPct,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [traces, metricsets];
      };

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_hosts', () => hosts)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            instances.flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
