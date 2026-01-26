/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Error Groups - APM Errors and OTel Exceptions
 *
 * Story: Generates APM error data across multiple services with different exception types,
 * culprits, and handled/unhandled states. Also generates OTel log exceptions for services
 * that emit exceptions via logs (not processed by APM). Used to test the `get_error_groups` tool.
 *
 * APM Error Services:
 * - `payment-service` (production)
 *   - NullPointerException in PaymentProcessor.processPayment (handled, high volume)
 *   - TimeoutException in PaymentGateway.connect (unhandled, medium volume)
 * - `user-service` (production)
 *   - ValidationException in UserValidator.validate (handled, medium volume)
 * - `order-service` (staging)
 *   - OutOfStockException in InventoryService.reserve (handled, high volume)
 *
 * OTel Log Exception Services:
 * - `notification-service` (production)
 *   - SmtpConnectionException: "Failed to connect to SMTP server" (high volume)
 *   - TemplateRenderException: "Failed to render email template" (medium volume)
 * - `analytics-service` (production)
 *   - DataPipelineException: "Pipeline processing failed" (medium volume)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_error_groups",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type {
  ApmFields,
  APMStacktrace,
  LogDocument,
  Serializable,
  Timerange,
} from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

/**
 * Configuration for an error type within a service
 */
export interface ErrorConfig {
  type: string;
  message: string;
  culprit: string;
  handled: boolean;
  rate: number;
  stacktrace?: APMStacktrace[];
  /** Optional downstream dependency for failed outbound span generation. */
  downstreamServiceResource?: string;
  /** Optional span name for downstream dependency. */
  spanName?: string;
  /** Optional span type for downstream dependency. */
  spanType?: string;
  /** Optional span subtype for downstream dependency. */
  spanSubtype?: string;
  /** Optional span duration (ms) for downstream dependency. */
  spanDuration?: number;
}

/**
 * Configuration for a service to generate error data
 */
export interface ErrorServiceConfig {
  name: string;
  environment: string;
  agentName: string;
  transactionName: string;
  errors: ErrorConfig[];
}

/**
 * Default service configurations for testing error groups.
 * Includes a variety of error types across multiple services with one stack trace example.
 */
export const DEFAULT_ERROR_SERVICES: ErrorServiceConfig[] = [
  {
    name: 'payment-service',
    environment: 'production',
    agentName: 'java',
    transactionName: 'POST /api/payment',
    errors: [
      {
        type: 'NullPointerException',
        message: 'Cannot invoke method on null object',
        culprit: 'com.example.payment.PaymentProcessor.processPayment',
        handled: true,
        rate: 5,
        stacktrace: [
          {
            filename: 'PaymentProcessor.java',
            function: 'processPayment',
            line: { number: 42 },
            module: 'com.example.payment',
          },
          {
            filename: 'PaymentService.java',
            function: 'handleRequest',
            line: { number: 128 },
            module: 'com.example.payment',
          },
        ],
      },
      {
        type: 'TimeoutException',
        message: 'Connection timed out after 30000ms',
        culprit: 'com.example.payment.PaymentGateway.connect',
        handled: false,
        rate: 2,
        downstreamServiceResource: 'payment-gateway-api',
        spanName: 'POST https://payment-gateway.example.com/charge',
        spanType: 'external',
        spanSubtype: 'http',
        spanDuration: 3000,
      },
    ],
  },
  {
    name: 'user-service',
    environment: 'production',
    agentName: 'nodejs',
    transactionName: 'GET /api/user',
    errors: [
      {
        type: 'ValidationException',
        message: 'Invalid email format',
        culprit: 'UserValidator.validate at src/validators/user.js:42',
        handled: true,
        rate: 3,
      },
    ],
  },
  {
    name: 'order-service',
    environment: 'staging',
    agentName: 'python',
    transactionName: 'POST /api/order',
    errors: [
      {
        type: 'OutOfStockException',
        message: 'Product is out of stock',
        culprit: 'inventory_service.reserve in app/services/inventory.py:87',
        handled: true,
        rate: 4,
      },
    ],
  },
];

/**
 * Configuration for an OTel log exception
 */
export interface LogExceptionConfig {
  type: string;
  message: string;
  rate: number;
  stacktrace?: string;
}

/**
 * Configuration for a service that emits exceptions via logs (OTel format)
 */
export interface LogExceptionServiceConfig {
  name: string;
  environment: string;
  exceptions: LogExceptionConfig[];
}

/**
 * Default OTel log exception services for testing.
 * These represent services that emit exceptions via logs, not processed by APM.
 */
export const DEFAULT_LOG_EXCEPTION_SERVICES: LogExceptionServiceConfig[] = [
  {
    name: 'notification-service',
    environment: 'production',
    exceptions: [
      {
        type: 'SmtpConnectionException',
        message: 'Failed to connect to SMTP server at smtp.example.com:587',
        rate: 4,
        stacktrace: `at SmtpClient.connect (SmtpClient.java:89)
at NotificationService.sendEmail (NotificationService.java:142)
at EmailWorker.process (EmailWorker.java:56)`,
      },
      {
        type: 'TemplateRenderException',
        message: 'Failed to render email template: missing variable "userName"',
        rate: 2,
      },
    ],
  },
  {
    name: 'analytics-service',
    environment: 'production',
    exceptions: [
      {
        type: 'DataPipelineException',
        message: 'Pipeline processing failed: invalid data format in batch 12345',
        rate: 3,
      },
    ],
  },
];

/**
 * Converts structured stacktrace to OTel/ECS compliant string format.
 * Example output: "at processPayment (PaymentProcessor.java:42)\n at handleRequest (PaymentService.java:128)"
 */
function stacktraceToString(stacktrace?: APMStacktrace[]): string | undefined {
  if (!stacktrace || stacktrace.length === 0) return undefined;
  return stacktrace
    .map((frame) => {
      const lineNumber = frame.line && 'number' in frame.line ? frame.line.number : undefined;
      return `at ${frame.function} (${frame.filename}:${lineNumber})`;
    })
    .join('\n');
}

/**
 * Generates APM error data for error groups testing.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
/**
 * Creates a failure span to a downstream service resource.
 * The span will share the same trace.id as the parent transaction.
 */
function buildDownstreamFailureSpan({
  instance,
  errorConfig,
  timestamp,
}: {
  instance: ReturnType<ReturnType<typeof apm.service>['instance']>;
  errorConfig: ErrorConfig;
  timestamp: number;
}) {
  if (!errorConfig.downstreamServiceResource) {
    return undefined;
  }

  const spanName = errorConfig.spanName ?? `CALL ${errorConfig.downstreamServiceResource}`;
  const spanType = errorConfig.spanType ?? 'external';
  const spanSubtype = errorConfig.spanSubtype ?? 'http';
  const spanDuration = errorConfig.spanDuration ?? 50;

  return instance
    .span(spanName, spanType, spanSubtype)
    .destination(errorConfig.downstreamServiceResource)
    .timestamp(timestamp + 1)
    .duration(spanDuration)
    .failure();
}

export function generateErrorGroupsData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: ErrorServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range.interval('1m').generator((timestamp) =>
    services.flatMap((serviceConfig) => {
      const instance = apm
        .service({
          name: serviceConfig.name,
          environment: serviceConfig.environment,
          agentName: serviceConfig.agentName,
        })
        .instance(`${serviceConfig.name}-instance`);

      return serviceConfig.errors.flatMap((errorConfig) => {
        const events: Array<Serializable<ApmFields>> = [];

        // Convert structured stacktrace to string for OTel/ECS compliance
        const stackTraceString = stacktraceToString(errorConfig.stacktrace);

        // Generate errors at the specified rate
        for (let i = 0; i < errorConfig.rate; i++) {
          const errorTimestamp = timestamp + i * 10;
          const errorEvent = instance
            .error({
              message: errorConfig.message,
              type: errorConfig.type,
              culprit: errorConfig.culprit,
              stacktrace: errorConfig.stacktrace,
            })
            .timestamp(errorTimestamp);

          // Add string stacktrace (OTel/ECS compliant) if available
          const errorWithStacktrace = stackTraceString
            ? errorEvent.overrides({ 'error.stack_trace': stackTraceString })
            : errorEvent;

          // Build downstream failure span if configured
          const downstreamSpan = buildDownstreamFailureSpan({
            instance,
            errorConfig,
            timestamp: errorTimestamp,
          });

          events.push(
            instance
              .transaction({ transactionName: serviceConfig.transactionName })
              .timestamp(errorTimestamp)
              .duration(100)
              .failure()
              .errors(errorWithStacktrace)
              .children(...(downstreamSpan ? [downstreamSpan] : []))
          );
        }

        return events;
      });
    })
  );

  return withClient(apmEsClient, data);
}

/**
 * Generates OTel log exception data for log exception groups testing.
 * These represent exceptions logged via OTel semantic conventions (event.name: "exception").
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateLogExceptionGroupsData({
  range,
  logsEsClient,
  services,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  services: LogExceptionServiceConfig[];
}): ScenarioReturnType<LogDocument> {
  const data = range.interval('1m').generator((timestamp) =>
    services.flatMap((serviceConfig) =>
      serviceConfig.exceptions.flatMap((exceptionConfig) => {
        const events: Array<Serializable<LogDocument>> = [];

        for (let i = 0; i < exceptionConfig.rate; i++) {
          const logEvent = log
            .create()
            .message(exceptionConfig.message)
            .logLevel('error')
            .service(serviceConfig.name)
            .defaults({
              'service.name': serviceConfig.name,
              'service.environment': serviceConfig.environment,

              // OTel exception fields (per OTel semantic conventions)
              'event.name': 'exception',
              'error.exception.type': exceptionConfig.type,
              'error.exception.message': exceptionConfig.message,
              ...(exceptionConfig.stacktrace
                ? { 'error.stack_trace': exceptionConfig.stacktrace }
                : {}),
            })
            .timestamp(timestamp);

          events.push(logEvent);
        }

        return events;
      })
    )
  );

  return withClient(logsEsClient, data);
}

/**
 * Generates both APM error data and OTel log exception data.
 * This is the complete data generator for the get_error_groups tool.
 */
export function generateAllErrorGroupsData({
  range,
  apmEsClient,
  logsEsClient,
  apmServices = DEFAULT_ERROR_SERVICES,
  logExceptionServices = DEFAULT_LOG_EXCEPTION_SERVICES,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  apmServices?: ErrorServiceConfig[];
  logExceptionServices?: LogExceptionServiceConfig[];
}): Array<ScenarioReturnType<ApmFields> | ScenarioReturnType<LogDocument>> {
  const apmResult = generateErrorGroupsData({
    range,
    apmEsClient,
    services: apmServices,
  });

  const logsResult = generateLogExceptionGroupsData({
    range,
    logsEsClient,
    services: logExceptionServices,
  });

  return [apmResult, logsResult];
}

export default createCliScenario<ApmFields | LogDocument>(
  ({ range, clients: { apmEsClient, logsEsClient } }) => {
    return generateAllErrorGroupsData({
      range,
      apmEsClient,
      logsEsClient,
      apmServices: DEFAULT_ERROR_SERVICES,
      logExceptionServices: DEFAULT_LOG_EXCEPTION_SERVICES,
    });
  }
);
