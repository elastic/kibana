/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a service outage caused by a host running out of disk space.
 * This scenario is purely based on logs and metrics, containing no APM traces.
 *
 * The Demo Story:
 * "A critical `billing-processor` service has suddenly stopped processing invoices.
 * The service's error logs are flooding with 'No space left on device'. The on-call
 * engineer needs to quickly confirm the root cause by correlating the application
 * logs with the underlying infrastructure metrics."
 *
 * What this scenario generates:
 * For the first 70% of the time, the `billing-processor` logs successful invoices
 * and host disk metrics show usage gradually increasing. For the final 30%, the
 * host's disk usage spikes to 100%, and the service begins logging critical
 * file write errors.
 */

import type { InfraDocument, LogDocument } from '@kbn/apm-synthtrace-client';
import { infra, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const HOST_NAME = 'billing-host-01';
const SERVICE_NAME = 'billing-processor';

const scenario: Scenario<InfraDocument | LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { infraEsClient, logsEsClient } }) => {
      const incidentStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.7;

      const timestamps = range.interval('10s').rate(1);

      // Generate Host Metrics
      const host = infra.host(HOST_NAME);
      const hostMetrics = timestamps.generator((timestamp) => {
        const isIncident = timestamp > incidentStartTime;
        const diskUsedPct = isIncident
          ? 1.0
          : 0.6 +
            0.3 * ((timestamp - range.from.getTime()) / (incidentStartTime - range.from.getTime()));

        return host
          .filesystem({ 'system.filesystem.used.pct': diskUsedPct })
          .defaults({
            'agent.id': 'metricbeat-agent',
            'host.hostname': HOST_NAME,
            'host.name': HOST_NAME,
          })
          .timestamp(timestamp);
      });

      // Generate Service Logs
      const logGenerator = timestamps.generator((timestamp, i) => {
        const isIncident = timestamp > incidentStartTime;

        if (isIncident) {
          return log
            .create({ isLogsDb })
            .message('CRITICAL: Failed to write invoice to disk. No space left on device.')
            .logLevel('error')
            .defaults({
              'service.name': SERVICE_NAME,
              'host.name': HOST_NAME,
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }

        return log
          .create({ isLogsDb })
          .message(`Successfully processed and saved invoice #${1000 + i}.`)
          .logLevel('info')
          .defaults({
            'service.name': SERVICE_NAME,
            'host.name': HOST_NAME,
            'service.environment': ENVIRONMENT,
          })
          .timestamp(timestamp);
      });

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_events', () => hostMetrics)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_log_events', () => logGenerator)
        ),
      ];
    },
  };
};

export default scenario;
