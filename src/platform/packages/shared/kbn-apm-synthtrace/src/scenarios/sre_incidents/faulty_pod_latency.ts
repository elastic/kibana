/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a latency spike affecting a single faulty pod in a load-balanced service.
 *
 * The Demo Story:
 * A `user-profile-service` is experiencing high latency, but no errors. The issue
 * is isolated to a single pod, `user-profile-pod-3`, which is suffering from high
 * disk I/O. This scenario is designed to be solved using correlation analysis to
 * link the slow transactions to the specific faulty pod.
 */

import type { ApmFields, InfraDocument, LogDocument } from '@kbn/apm-synthtrace-client';
import { apm, httpExitSpan, infra, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const FAULTY_POD_NAME = 'user-profile-pod-3';
const POD_NAMES = [
  'user-profile-pod-1',
  'user-profile-pod-2',
  FAULTY_POD_NAME,
  'user-profile-pod-4',
];

const scenario: Scenario<ApmFields | LogDocument | InfraDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient, infraEsClient } }) => {
      const timestamps = range.interval('1s').rate(20); // 20 requests per second

      const frontendService = apm
        .service({ name: 'frontend-service', agentName: 'rum-js', environment: ENVIRONMENT })
        .instance('fe-1');

      const userProfileService = apm
        .service({ name: 'user-profile-service', agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('ups-1');

      // Generate Traces
      const traceEvents = timestamps.generator((timestamp, i) => {
        const podName = POD_NAMES[i % POD_NAMES.length];
        const isFaulty = podName === FAULTY_POD_NAME;
        const duration = isFaulty ? 2500 : 250;

        const userProfileTransaction = userProfileService
          .transaction({ transactionName: 'GET /api/users/{id}' })
          .timestamp(timestamp)
          .duration(duration)
          .success()
          .defaults({ 'kubernetes.pod.name': podName });

        return frontendService
          .transaction({ transactionName: 'GET /user-profile' })
          .timestamp(timestamp)
          .duration(duration + 50)
          .success()
          .children(
            frontendService
              .span(
                httpExitSpan({
                  spanName: 'GET /api/users/{id}',
                  destinationUrl: 'http://user-profile-service',
                })
              )
              .duration(duration)
              .timestamp(timestamp)
              .children(userProfileTransaction)
          );
      });

      // Generate Logs
      const logEvents = timestamps.generator((timestamp, i) => {
        const podName = POD_NAMES[i % POD_NAMES.length];
        if (podName !== FAULTY_POD_NAME) {
          return [];
        }

        return log
          .create({ isLogsDb })
          .message('High I/O wait detected for query on users table.')
          .logLevel('warn')
          .defaults({
            'service.name': 'user-profile-service',
            'kubernetes.pod.name': podName,
            'service.environment': ENVIRONMENT,
          })
          .timestamp(timestamp);
      });

      // Generate Metrics
      const hostMetrics = range.interval('10s').rate(1).generator((timestamp) => {
        return POD_NAMES.map((podName) => {
          const isFaulty = podName === FAULTY_POD_NAME;
          const hostName = `host-for-${podName}`;
          const host = infra.host(hostName);
          const defaults = {
            'agent.id': 'metricbeat-agent',
            'host.hostname': hostName,
            'host.name': hostName,
            'kubernetes.pod.name': podName,
          };

          return host
            .diskio({
              'system.diskio.read.bytes': isFaulty ? 50000000 : 10000,
              'system.diskio.write.bytes': isFaulty ? 25000000 : 5000,
            })
            .defaults(defaults)
            .timestamp(timestamp);
        });
      });

      return [
        withClient(apmEsClient, logger.perf('generating_apm_events', () => traceEvents)),
        withClient(logsEsClient, logger.perf('generating_log_events', () => logEvents)),
        withClient(infraEsClient, logger.perf('generating_infra_events', () => hostMetrics)),
      ];
    },
  };
};

export default scenario;
