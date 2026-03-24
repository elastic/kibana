/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Disk Full Outage (Logs & Metrics Only)
 * Simulates a service outage caused by a host running out of disk space.
 * The "needle" (root cause) is buried under ambiguous logs and confounding metrics.
 *
 * THE STORY:
 * "A critical `billing-processor` service has become slow and is now intermittently
 * failing. The logs show vague warnings like 'processing is taking longer than usual'
 * and some CPU metrics are slightly elevated. The on-call engineer needs to dig
 * deeper to find the true root cause before it causes a full outage."
 *
 * ROOT CAUSE:
 * The host `billing-host-01` runs out of disk space, with the
 * `system.filesystem.used.pct` metric reaching 100%.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in Discover with the appropriate logs data view selected. Filter for
 *    'service.name: "billing-processor"' and observe the flood of "No space left
 *    on device" error logs.
 * 2. Note the 'host.name' ('billing-host-01') from the log documents.
 * 3. Pivot to the Infrastructure UI's "Hosts" view. Search for 'billing-host-01'.
 * 4. On the host details page, observe that the "Disk Usage" metric is at 100%,
 *    and its spike correlates perfectly with the start of the error logs.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'logs-*' data view. Filter for
 *    'service.name: "billing-processor"' and 'log.level: "error"'. Observe the
 *    "No space left on device" messages.
 * 2. Note the 'host.name' from the error logs ('billing-host-01').
 * 3. Create a Dashboard. Add a Lens visualization from the 'logs-*' data view
 *    showing the count of error logs over time.
 * 4. Add a second Lens visualization to the Dashboard, this time using the
 *    'metrics-*' data view. Plot the average 'system.filesystem.used.pct' over
 *    time, filtering for 'host.name: "billing-host-01"'.
 * 5. The resulting dashboard will show a clear correlation: the log errors begin
 *    at the exact moment the disk usage metric hits 100%.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why is the billing-processor service logging errors?"
 * - "Show me the disk usage for host billing-host-01."
 * - "Correlate the errors from the billing-processor with host metrics."
 */

import type { InfraDocument, LogDocument } from '@kbn/synthtrace-client';
import { infra, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const HOST_NAME = 'billing-host-01';
const BILLING_SERVICE = 'billing-processor';
const LOG_ARCHIVER_SERVICE = 'log-archiver';

const scenario: Scenario<InfraDocument | LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { infraEsClient, logsEsClient } }) => {
      const degradedStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.7;
      const outageStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.95;

      const timestamps = range.interval('10s').rate(1);

      // Generate Host Metrics
      const host = infra.host(HOST_NAME);
      const hostMetrics = timestamps.generator((timestamp) => {
        const isDegraded = timestamp > degradedStartTime;
        const isOutage = timestamp > outageStartTime;

        let diskUsedPct;
        if (isOutage) {
          diskUsedPct = 1.0;
        } else if (isDegraded) {
          diskUsedPct = 0.95 + Math.random() * 0.04; // Hover between 95% and 99%
        } else {
          // Steadily increase from 60% to 95%
          diskUsedPct =
            0.6 +
            0.35 *
              ((timestamp - range.from.getTime()) / (degradedStartTime - range.from.getTime()));
        }

        const defaults = {
          'agent.id': 'metricbeat-agent',
          'host.hostname': HOST_NAME,
          'host.name': HOST_NAME,
        };

        return [
          host
            .filesystem({ 'system.filesystem.used.pct': diskUsedPct })
            .defaults(defaults)
            .timestamp(timestamp),
          host
            .cpu({
              // Red herring: CPU load increases slightly during the incident
              'system.cpu.total.norm.pct': isDegraded ? 0.4 + Math.random() * 0.1 : 0.2,
              'system.cpu.user.pct': 0.1,
              'system.cpu.system.pct': isDegraded ? 0.3 + Math.random() * 0.1 : 0.1,
              'process.cpu.pct': 0.1,
              'system.cpu.nice.pct': 0,
            })
            .defaults(defaults)
            .timestamp(timestamp),
        ];
      });

      // Generate Service Logs
      const logGenerator = timestamps.generator((timestamp, i) => {
        const isDegraded = timestamp > degradedStartTime;
        const isOutage = timestamp > outageStartTime;

        const logs = [];

        if (isOutage) {
          logs.push(
            log
              .create({ isLogsDb })
              .message('CRITICAL: Failed to write invoice to disk. No space left on device.')
              .logLevel('error')
              .defaults({
                'service.name': BILLING_SERVICE,
                'host.name': HOST_NAME,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp),
            log
              .create({ isLogsDb })
              .message('FATAL: Could not write to archive. No space left on device.')
              .logLevel('error')
              .defaults({
                'service.name': LOG_ARCHIVER_SERVICE,
                'host.name': HOST_NAME,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp)
          );
        } else if (isDegraded) {
          logs.push(
            log
              .create({ isLogsDb })
              .message(`Invoice processing for #${1000 + i} is taking longer than usual.`)
              .logLevel('warn')
              .defaults({
                'service.name': BILLING_SERVICE,
                'host.name': HOST_NAME,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp),
            log
              .create({ isLogsDb })
              .message('Log rotation queue is filling up. Archiving is delayed.')
              .logLevel('warn')
              .defaults({
                'service.name': LOG_ARCHIVER_SERVICE,
                'host.name': HOST_NAME,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp)
          );
        } else {
          logs.push(
            log
              .create({ isLogsDb })
              .message(`Successfully processed and saved invoice #${1000 + i}.`)
              .logLevel('info')
              .defaults({
                'service.name': BILLING_SERVICE,
                'host.name': HOST_NAME,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp)
          );
        }

        return logs;
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
