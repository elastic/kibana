/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { InfraDocument, apm, Instance, infra, ApmFields } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<InfraDocument | ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      const { numServices = 3, numHosts = 10 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

      // Infra hosts Data logic

      const HOSTS = Array(numHosts)
        .fill(0)
        .map((_, idx) => infra.host(`my-host-${idx}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          HOSTS.flatMap((host) => [
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      // APM Simple Trace

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: `synth-node-${index}`, environment: ENVIRONMENT, agentName: 'nodejs' })
          .instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [metricsets];
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
