/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Error Groups
 *
 * Story: Generates APM errors and OTel exceptions for `get_error_groups` tool testing.
 *
 * APM Errors (payment-service):
 * - NullPointerException: "Cannot read property 'id' of null"
 * - TimeoutException: "Connection timed out after 30s"
 *
 * OTel Exceptions (order-service):
 * - ValidationException: "Invalid order format"
 * - DatabaseException: "Connection pool exhausted"
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_error_groups",
 *   "tool_params": {
 *     "serviceName": "payment-service",
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import { apm, log } from '@kbn/synthtrace-client';
import type { ApmFields, LogDocument, Timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

interface ErrorConfig {
  serviceName: string;
  environment: string;
  language: string;
  errors: Array<{
    type: string;
    message: string;
    rate: number;
  }>;
}

interface OTelExceptionConfig {
  serviceName: string;
  environment: string;
  hostName: string;
  exceptions: Array<{
    type: string;
    messages: string[];
    rate: number;
  }>;
}

/**
 * Generates APM error data for testing.
 */
export function generateApmErrorGroupsData({
  range,
  apmEsClient,
  errorConfigs,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  errorConfigs: ErrorConfig[];
}): ScenarioReturnType<ApmFields>[] {
  return errorConfigs.flatMap((config) => {
    const instance = apm
      .service({
        name: config.serviceName,
        environment: config.environment,
        agentName: config.language,
      })
      .instance(`${config.serviceName}-instance`);

    return config.errors.map((errorDef) => {
      const data = range
        .interval('1m')
        .rate(errorDef.rate)
        .generator((timestamp) => [
          instance
            .transaction('GET /api')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              instance
                .error({ message: errorDef.message, type: errorDef.type })
                .timestamp(timestamp)
            ),
        ]);

      return withClient(apmEsClient, data);
    });
  });
}

/**
 * Extended log document with exception fields.
 * The handler queries for top-level exception.type/exception.message fields.
 */
type ExceptionLogDocument = LogDocument & {
  'exception.type'?: string;
  'exception.message'?: string;
};

/**
 * Generates OTel exception logs for testing.
 * Creates logs with exception.type and exception.message fields.
 * Uses the same pattern as generateLogCategoriesData for consistency.
 */
export function generateOTelExceptionGroupsData({
  range,
  logsEsClient,
  exceptionConfigs,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  exceptionConfigs: OTelExceptionConfig[];
}): ScenarioReturnType<LogDocument> {
  // Flatten all exception events into a single list for the generator
  const allExceptions: Array<{
    serviceName: string;
    environment: string;
    hostName: string;
    type: string;
    message: string;
    rate: number;
  }> = [];

  for (const config of exceptionConfigs) {
    for (const exceptionDef of config.exceptions) {
      for (const message of exceptionDef.messages) {
        allExceptions.push({
          serviceName: config.serviceName,
          environment: config.environment,
          hostName: config.hostName,
          type: exceptionDef.type,
          message,
          rate: exceptionDef.rate,
        });
      }
    }
  }

  // Create a single generator that produces all exception logs
  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      allExceptions.map((exc) =>
        log
          .create()
          .message(`Exception occurred: ${exc.message}`)
          .logLevel('error')
          .service(exc.serviceName)
          .hostName(exc.hostName)
          .defaults({
            'service.name': exc.serviceName,
            'service.environment': exc.environment,
            'host.name': exc.hostName,
            'log.level': 'error',
            'exception.type': exc.type,
            'exception.message': exc.message,
          } as ExceptionLogDocument)
          .timestamp(timestamp)
      )
    );

  return withClient(logsEsClient, data);
}

/**
 * Generates complete error groups data (APM errors + OTel exceptions).
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 *
 * Returns separate generators for APM and logs to allow sequential indexing.
 * Each generator includes its client via withClient().
 */
export function generateErrorGroupsData({
  range,
  apmEsClient,
  logsEsClient,
  apmErrorConfigs,
  otelExceptionConfigs,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  apmErrorConfigs: ErrorConfig[];
  otelExceptionConfigs: OTelExceptionConfig[];
}): {
  apm: ScenarioReturnType<ApmFields>[];
  logs: ScenarioReturnType<LogDocument>;
} {
  return {
    apm: generateApmErrorGroupsData({ range, apmEsClient, errorConfigs: apmErrorConfigs }),
    logs: generateOTelExceptionGroupsData({
      range,
      logsEsClient,
      exceptionConfigs: otelExceptionConfigs,
    }),
  };
}

// Default configurations for CLI usage
const defaultApmErrorConfigs: ErrorConfig[] = [
  {
    serviceName: 'payment-service',
    environment: 'production',
    language: 'java',
    errors: [
      {
        type: 'NullPointerException',
        message: "Cannot read property 'id' of null",
        rate: 5,
      },
      {
        type: 'TimeoutException',
        message: 'Connection timed out after 30s',
        rate: 3,
      },
    ],
  },
];

const defaultOTelExceptionConfigs: OTelExceptionConfig[] = [
  {
    serviceName: 'order-service',
    environment: 'production',
    hostName: 'order-host-01',
    exceptions: [
      {
        type: 'ValidationException',
        messages: ['Invalid order format', 'Missing required field: customerId'],
        rate: 4,
      },
      {
        type: 'DatabaseException',
        messages: ['Connection pool exhausted', 'Query timeout exceeded'],
        rate: 2,
      },
    ],
  },
];

/**
 * CLI scenario - generates both APM errors and OTel exceptions.
 * For CLI usage, we combine all generators into a single array.
 */
export default createCliScenario<ApmFields | LogDocument>(
  ({ range, clients: { apmEsClient, logsEsClient } }) => {
    const { apm: apmGenerators, logs: logsGenerator } = generateErrorGroupsData({
      range,
      apmEsClient,
      logsEsClient,
      apmErrorConfigs: defaultApmErrorConfigs,
      otelExceptionConfigs: defaultOTelExceptionConfigs,
    });
    return [...apmGenerators, logsGenerator] as Array<ScenarioReturnType<ApmFields | LogDocument>>;
  }
);
