/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Faulty Pod Latency
 * Simulates a latency spike affecting a single faulty pod in a load-balanced service.
 *
 * THE STORY:
 * A `user-profile-service` is experiencing high latency, but no errors. The issue
 * is isolated to a single pod, `user-profile-pod-3`, which is suffering from high
 * disk I/O.
 *
 * ROOT CAUSE:
 * High disk I/O (`system.diskio.read.bytes`) on the host serving
 * `user-profile-pod-3`, causing degraded performance for that specific pod.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM UI for the 'user-profile-service'. Observe the high
 *    latency anomaly in the main transaction chart.
 * 2. In the "Transactions" tab, group the latency chart by 'kubernetes.pod.name'.
 *    This will clearly isolate 'user-profile-pod-3' as the source of the latency.
 * 3. From the service overview, select the "Metrics" tab and view host metrics.
 *    Correlate the APM latency spike with a spike in the "Disk I/O" metric.
 * 4. Pivot to Discover, ensuring the logs data view is selected. Filter for
 *    'kubernetes.pod.name : "user-profile-pod-3"' to see the recurring
 *    "High I/O wait detected" warning logs.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'traces-apm-*' data view, filtering for
 *    'service.name: "user-profile-service"'.
 * 2. Create a Lens visualization (Line Chart) plotting the 95th percentile of
 *    'transaction.duration.us' over time. Observe the significant latency spike.
 * 3. Add a "break down by" dimension to the chart using the 'kubernetes.pod.name'
 *    field. This will isolate 'user-profile-pod-3' as the sole source of latency.
 * 4. Pivot to the 'logs-*' data view in Discover. Filter for
 *    'kubernetes.pod.name: "user-profile-pod-3"'. Find the "High I/O wait detected"
 *    warning logs.
 * 5. On a Dashboard, correlate the APM latency chart from Lens with a metrics chart
 *    from the 'metrics-*' data view, plotting the max 'system.diskio.read.bytes'
 *    for 'user-profile-pod-3'. The two spikes will align perfectly.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why is the user-profile-service slow?"
 * - "Is the latency spike for the user-profile-service correlated with a specific pod?"
 * - "Show me the logs for user-profile-pod-3."
 * - "What is the root cause of the high latency on user-profile-pod-3?"
 */

import type { ApmFields, InfraDocument, LogDocument } from '@kbn/synthtrace-client';
import { apm, httpExitSpan, infra, log } from '@kbn/synthtrace-client';
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

      const incidentStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.5;

      // Generate Traces
      const traceEvents = timestamps.generator((timestamp, i) => {
        const podName = POD_NAMES[i % POD_NAMES.length];
        const isFaulty = podName === FAULTY_POD_NAME && timestamp > incidentStartTime;
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
        if (podName !== FAULTY_POD_NAME || timestamp < incidentStartTime) {
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
      const hostMetrics = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) => {
          return POD_NAMES.map((podName) => {
            const isFaulty = podName === FAULTY_POD_NAME && timestamp > incidentStartTime;
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
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => traceEvents)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_log_events', () => logEvents)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_infra_events', () => hostMetrics)
        ),
      ];
    },
  };
};

export default scenario;
