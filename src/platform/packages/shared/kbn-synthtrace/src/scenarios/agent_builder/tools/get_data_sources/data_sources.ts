/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Data Sources
 *
 * Story: Generates minimal data across Logs and APM to verify `get_data_sources`.
 *
 * Data generated:
 * - Logs: Simple log messages in `logs-web.access-default`
 * - APM: Failed transactions with errors from `my-service` in production
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_data_sources",
 *   "tool_params": {}
 * }
 * ```
 */

import type { ApmFields, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';
import { generateApmErrorData } from '../get_alerts/apm_errors';

/**
 * Generates simple log entries for testing data sources tools.
 *
 * @param options - Configuration options
 * @param options.range - Time range from synthtrace timerange()
 * @param options.logsEsClient - Logs synthtrace client
 * @param options.message - Log message (default: 'simple log message')
 * @param options.dataset - Dataset name (default: 'web.access')
 * @returns ScenarioReturnType with generated logs
 */
export function generateSimpleLogsData({
  range,
  logsEsClient,
  message = 'simple log message',
  dataset = 'web.access',
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  message?: string;
  dataset?: string;
}): ScenarioReturnType<LogDocument> {
  const simpleLogs = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => log.create().message(message).dataset(dataset).timestamp(timestamp));

  return withClient(logsEsClient, simpleLogs);
}

/**
 * Generates data across Logs and APM data sources.
 * Used for testing the get_data_sources tool.
 * This is the same data that the API tests use.
 *
 * @param options - Configuration options
 * @param options.range - Time range from synthtrace timerange()
 * @param options.logsEsClient - Logs synthtrace client
 * @param options.apmEsClient - APM synthtrace client
 * @param options.serviceName - Service name for APM data (default: 'my-service')
 * @param options.environment - Environment for APM data (default: 'production')
 * @param options.language - Agent language for APM data (default: 'go')
 * @returns Array of ScenarioReturnType for logs and APM data
 */
export function generateDataSourcesData({
  range,
  logsEsClient,
  apmEsClient,
  serviceName = 'my-service',
  environment = 'production',
  language = 'go',
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  apmEsClient: ApmSynthtraceEsClient;
  serviceName?: string;
  environment?: string;
  language?: string;
}): Array<ScenarioReturnType<LogDocument | ApmFields>> {
  // 1. Simple logs
  const logs = generateSimpleLogsData({ range, logsEsClient });

  // 2. APM error data (reuses generateApmErrorData from get_alerts)
  const apmData = generateApmErrorData({
    range,
    apmEsClient,
    serviceName,
    environment,
    language,
  });

  return [logs, ...apmData];
}

export default createCliScenario(({ range, clients: { logsEsClient, apmEsClient } }) =>
  generateDataSourcesData({ range, logsEsClient, apmEsClient })
);
