/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * APM-only hosts for the Hosts UI union-with-APM path. No infra metric docs.
 *
 * Run (ECS schema):
 *   node scripts/synthtrace hosts_apm_only --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500,schema=ecs
 *
 * Run (semconv / OTel schema):
 *   node scripts/synthtrace hosts_apm_only --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500,schema=semconv
 */

import type { ApmFields, ApmOtelFields, Fields } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import {
  formatHostName,
  getDeterministicApmDurationMs,
  getDeterministicApmThroughput,
  getHostCount,
} from './helpers/hosts_benchmark';
import { getStringOpt } from './helpers/scenario_opts_helpers';

const SCENARIO_NAME = 'hosts_apm_only';
const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const TRANSACTION_NAME = 'GET /api/host/{id}';

const scenario: Scenario<Fields | ApmFields | ApmOtelFields> = async ({ logger, scenarioOpts }) => {
  const numHosts = getHostCount(scenarioOpts);
  const schema = getStringOpt(scenarioOpts, 'schema') ?? 'ecs';

  if (schema !== 'ecs' && schema !== 'semconv') {
    throw new Error(`Unknown schema "${schema}". Expected "ecs" or "semconv".`);
  }

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      if (schema === 'semconv') {
        const otelInstances = times(numHosts).map((hostIndex) => {
          const hostName = formatHostName(hostIndex);
          return apm
            .otelService({
              name: `synth-otel-svc-${hostIndex}`,
              namespace: ENVIRONMENT,
              sdkLanguage: 'java',
              sdkName: 'opentelemetry',
              distro: 'elastic',
            })
            .instance(hostName);
        });

        const traces = otelInstances.flatMap((instance, hostIndex) => {
          const throughput = getDeterministicApmThroughput(SCENARIO_NAME, hostIndex);
          const { parentDuration } = getDeterministicApmDurationMs(SCENARIO_NAME, hostIndex);

          return range
            .ratePerMinute(throughput)
            .generator((timestamp) =>
              instance
                .span({ name: TRANSACTION_NAME, kind: 'Server' })
                .timestamp(timestamp)
                .duration(parentDuration)
                .success()
            );
        });

        return withClient(
          apmEsClient,
          logger.perf('generating_hosts_apm_only_semconv', () => traces)
        );
      }

      const instances = times(numHosts).map((hostIndex) => {
        const hostName = formatHostName(hostIndex);
        return apm
          .service({
            name: `synth-node-${hostIndex}`,
            environment: ENVIRONMENT,
            agentName: 'node-js',
          })
          .instance(hostName);
      });

      const traces = instances.flatMap((instance, hostIndex) => {
        const throughput = getDeterministicApmThroughput(SCENARIO_NAME, hostIndex);
        const { parentDuration } = getDeterministicApmDurationMs(SCENARIO_NAME, hostIndex);

        return range
          .ratePerMinute(throughput)
          .generator((timestamp) =>
            instance
              .transaction({ transactionName: TRANSACTION_NAME })
              .timestamp(timestamp)
              .duration(parentDuration)
              .success()
          );
      });

      return withClient(
        apmEsClient,
        logger.perf('generating_hosts_apm_only_ecs', () => traces)
      );
    },
    setupPipeline: ({ apmEsClient }) => {
      if (schema === 'semconv') {
        apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
      }
    },
  };
};

export default scenario;
