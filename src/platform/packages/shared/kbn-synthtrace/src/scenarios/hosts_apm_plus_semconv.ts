/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Semconv infra metrics on the first half of the fleet plus APM-only hosts on
 * the second half (disjoint hostnames). Exercises the Hosts UI union path with
 * both infra and APM populations populated.
 *
 * Run:
 *   node scripts/synthtrace hosts_apm_plus_semconv --from=now-24h --to=now \
 *     --scenarioOpts=hosts=1500
 */

import type { ApmOtelFields, Fields, InfraDocument } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import {
  configureTsdsOtelTemplate,
  formatHostName,
  generateSemconvHostMetricsAtTimestamp,
  getDeterministicApmDurationMs,
  getDeterministicApmThroughput,
  getHostCount,
} from './helpers/hosts_benchmark';

const SCENARIO_NAME = 'hosts_apm_plus_semconv';
const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const TRANSACTION_NAME = 'GET /api/host/{id}';

const scenario: Scenario<InfraDocument | Fields | ApmOtelFields> = async ({
  logger,
  scenarioOpts,
  from,
  to,
}) => {
  const numHosts = getHostCount(scenarioOpts);
  const numSemconvHosts = Math.floor(numHosts / 2);
  const numApmHosts = numHosts - numSemconvHosts;

  return {
    bootstrap: async ({ infraEsClient }) => {
      configureTsdsOtelTemplate(infraEsClient, from, to);
    },
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      const semconvMetrics = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) =>
          times(numSemconvHosts).flatMap((hostIndex) =>
            generateSemconvHostMetricsAtTimestamp(
              SCENARIO_NAME,
              hostIndex,
              formatHostName(hostIndex),
              timestamp,
              { staggerMs: true }
            )
          )
        );

      const otelInstances = times(numApmHosts).map((offset) => {
        const hostIndex = numSemconvHosts + offset;
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

      const apmTraces = otelInstances.flatMap((instance, offset) => {
        const hostIndex = numSemconvHosts + offset;
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

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_hosts_apm_plus_semconv_infra', () => semconvMetrics)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_hosts_apm_plus_semconv_apm', () => apmTraces)
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
