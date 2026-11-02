/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Services
 *
 * Story: Generates multiple services from APM and Logs in different environments
 * (production, staging, development) to verify `get_services` tool and its filtering capabilities.
 *
 * APM Services:
 * - `checkout-service` (production, nodejs)
 * - `payment-service` (production, java) - 50% error rate
 * - `frontend` (staging, rum-js)
 * - `experimental-service` (development, ruby)
 *
 * Logs-only Services:
 * - `log-processor` (production)
 * - `data-ingestion` (staging)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_services",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { ApmFields, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

/**
 * Configuration for an APM service to generate
 */
export interface ApmServiceConfig {
  name: string;
  environment: string;
  agentName: string;
  transactionName: string;
  transactionType: string;
  duration: number;
  errorRate?: number; // 0-1, probability of failure
}

/**
 * Configuration for a logs-only service to generate
 */
export interface LogsServiceConfig {
  name: string;
  environment?: string;
  dataset?: string;
}

/**
 * Generates APM service data.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateApmServicesData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: ApmServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return services.flatMap((serviceConfig) => {
        const instance = apm
          .service(serviceConfig.name, serviceConfig.environment, serviceConfig.agentName)
          .instance(`${serviceConfig.name}-01`);

        const isError = Math.random() < (serviceConfig.errorRate ?? 0);
        const duration = isError ? serviceConfig.duration * 2.5 : serviceConfig.duration;

        return instance
          .transaction(serviceConfig.transactionName, serviceConfig.transactionType)
          .timestamp(timestamp)
          .duration(duration)
          .outcome(isError ? 'failure' : 'success');
      });
    });

  return withClient(apmEsClient, data);
}

/**
 * Generates logs data with service.name field.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateLogsServicesData({
  range,
  logsEsClient,
  services,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  services: LogsServiceConfig[];
}): ScenarioReturnType<LogDocument> {
  const logGenerators = services.map((serviceConfig) =>
    range
      .interval('1m')
      .rate(5)
      .generator((timestamp) =>
        log
          .create()
          .message(`Log message from ${serviceConfig.name}`)
          .logLevel('info')
          .service(serviceConfig.name)
          .dataset(serviceConfig.dataset ?? 'generic')
          .defaults({
            'service.name': serviceConfig.name,
            ...(serviceConfig.environment && {
              'service.environment': serviceConfig.environment,
            }),
          })
          .timestamp(timestamp)
      )
  );

  return withClient(logsEsClient, logGenerators);
}

export default createCliScenario<ApmFields | LogDocument>(
  ({ range, clients: { apmEsClient, logsEsClient } }) => {
    // APM services
    const apmServices: ApmServiceConfig[] = [
      {
        name: 'checkout-service',
        environment: 'production',
        agentName: 'nodejs',
        transactionName: 'POST /api/checkout',
        transactionType: 'request',
        duration: 150,
        errorRate: 0,
      },
      {
        name: 'payment-service',
        environment: 'production',
        agentName: 'java',
        transactionName: 'POST /api/pay',
        transactionType: 'request',
        duration: 200,
        errorRate: 0.5, // 50% error rate
      },
      {
        name: 'frontend',
        environment: 'staging',
        agentName: 'rum-js',
        transactionName: 'PAGE_LOAD /home',
        transactionType: 'page-load',
        duration: 500,
        errorRate: 0,
      },
      {
        name: 'experimental-service',
        environment: 'development',
        agentName: 'ruby',
        transactionName: 'GET /test',
        transactionType: 'request',
        duration: 200,
        errorRate: 0,
      },
    ];

    // Logs-only services
    const logsServices: LogsServiceConfig[] = [
      { name: 'log-processor', environment: 'production' },
      { name: 'data-ingestion', environment: 'staging' },
    ];

    const apmData = generateApmServicesData({ range, apmEsClient, services: apmServices });
    const logsData = generateLogsServicesData({ range, logsEsClient, services: logsServices });

    return [apmData, logsData];
  }
);
