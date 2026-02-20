/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: `observability.get_traces` data
 *
 * Story: Generates a small set of distributed traces (transactions + spans + error) plus
 * multiple log sequences using a variety of correlation identifiers.
 *
 * This scenario is designed to exercise the tool's capabilities:
 * - Direct trace lookup via `kqlFilter` on `trace.id`
 * - Anchor-based lookup via broader `kqlFilter` (discovers multiple trace.id values)
 * - Using a specific document `_id` as the anchor in `kqlFilter`
 * - Limiting results via `maxTraces` (how many trace ids) and `maxDocsPerTrace` (docs per trace)
 *
 * Validate via:
 *
 * 1) Direct lookup by trace id
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_traces",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "kqlFilter": "trace.id: \"trace-get-traces-001\"",
 *     "maxTraces": 1
 *   }
 * }
 * ```
 *
 * 2) Anchor from logs by query (may discover multiple trace ids)
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_traces",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "kqlFilter": "service.name: payment-service",
 *     "maxTraces": 5,
 *     "maxDocsPerTrace": 100
 *   }
 * }
 * ```
 *
 * 3) Anchor from a specific document id
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_traces",
 *   "tool_params": {
 *     "kqlFilter": "_id: \"<document_id>\"",
 *     "maxTraces": 1
 *   }
 * }
 */

import type { ApmFields, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import {
  createLogSequence,
  generateCorrelatedLogsData,
} from '../get_correlated_logs/correlated_logs';

interface SpanConfig {
  spanName: string;
  spanType: string;
  spanSubtype: string;
  duration: number;
}

export interface GetTracesScenarioConfig {
  traceId: string;
  serviceName: string;
  environment: string;
  transactionName: string;
  transactionType: string;
  duration: number;
  outcome: 'success' | 'failure';
  error?: {
    message: string;
    type: string;
  };
  children?: SpanConfig[];
}

export const DEFAULT_TRACE_CONFIGS: GetTracesScenarioConfig[] = [
  {
    traceId: 'trace-get-traces-001',
    serviceName: 'checkout-service',
    environment: 'production',
    transactionName: 'POST /api/checkout',
    transactionType: 'request',
    duration: 250,
    outcome: 'failure',
    error: { message: 'Database query failed: timeout', type: 'db' },
    children: [
      // downstream spans
      { spanName: 'GET /api/cart', spanType: 'external', spanSubtype: 'http', duration: 40 },
      // db span
      { spanName: 'SELECT cart', spanType: 'db', spanSubtype: 'postgresql', duration: 60 },
    ],
  },
  {
    traceId: 'trace-get-traces-002',
    serviceName: 'payment-service',
    environment: 'production',
    transactionName: 'POST /api/payment',
    transactionType: 'request',
    duration: 180,
    outcome: 'success',
    children: [
      // downstream spans
      {
        spanName: 'GET /api/payment-gateway',
        spanType: 'external',
        spanSubtype: 'http',
        duration: 50,
      },
      // db span
      { spanName: 'INSERT payment', spanType: 'db', spanSubtype: 'postgresql', duration: 70 },
    ],
  },
];

export function generateGetTracesApmDataset({
  range,
  apmEsClient,
  traces,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  traces: GetTracesScenarioConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range
    .interval('5m')
    .rate(1)
    .generator((timestamp) => {
      return traces.flatMap((traceConfig, index) => {
        const baseTimestamp = timestamp + index * 1000;

        const instance = apm
          .service({
            name: traceConfig.serviceName,
            environment: traceConfig.environment,
            agentName: 'nodejs',
          })
          .instance(`${traceConfig.serviceName}-01`);

        const childrenSpans =
          traceConfig.children?.map((spanConfig, _index) => {
            return instance
              .span({
                spanName: spanConfig.spanName,
                spanType: spanConfig.spanType,
                spanSubtype: spanConfig.spanSubtype,
              })
              .timestamp(baseTimestamp + 10 * _index)
              .duration(spanConfig.duration);
          }) || [];

        let transaction = instance
          .transaction({
            transactionName: traceConfig.transactionName,
            transactionType: traceConfig.transactionType,
          })
          .timestamp(baseTimestamp)
          .duration(traceConfig.duration)
          .overrides({ 'trace.id': traceConfig.traceId })
          .children(...childrenSpans);

        transaction =
          traceConfig.outcome === 'failure' ? transaction.failure() : transaction.success();

        if (traceConfig.outcome === 'failure' && traceConfig.error) {
          transaction = transaction.errors(
            instance
              .error({ message: traceConfig.error.message, type: traceConfig.error.type })
              .timestamp(baseTimestamp + 90)
          );
        }

        return [transaction];
      });
    });

  return withClient(apmEsClient, data);
}

export function generateGetTracesLogsData({
  range,
  logsEsClient,
  config,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  config: GetTracesScenarioConfig;
}): ScenarioReturnType<LogDocument> {
  const { traceId, serviceName, environment } = config;

  // Keep this scenario focused on `trace.id` correlation so it exercises the common
  // `traceId` lookup path and the anchor-from-logs path (which prefers `trace.id`).
  // For additional correlation identifiers (request.id, session.id, etc.) we rely on the
  // default sequences from `logs.ts` (see default export below).
  const correlatedLogs = createLogSequence({
    service: serviceName,
    correlation: {
      'trace.id': traceId,
      // Provide an extra non-APM identifier so the tool's correlation priority can be exercised.
      // The get_traces tool should still prefer trace.id when present.
      'request.id': `req-${traceId}`,
    },
    defaults: {
      'service.environment': environment,
    },
    logs: [
      { 'log.level': 'info', message: 'Checkout request received' },
      { 'log.level': 'debug', message: 'Calling downstream cart service' },
      { 'log.level': 'error', message: 'Database query failed: timeout' },
    ],
  });

  return generateCorrelatedLogsData({ range, logsEsClient, logs: correlatedLogs });
}

export default createCliScenario<ApmFields | LogDocument>(
  ({ range, clients: { apmEsClient, logsEsClient } }) => {
    const apmData = generateGetTracesApmDataset({
      range,
      apmEsClient,
      traces: DEFAULT_TRACE_CONFIGS,
    });

    // Index two log sets:
    // 1) Default realistic sequences (uses generateDefaultSequences via generateCorrelatedLogsData)
    // 2) A deterministic trace.id-correlated sequence matching DEFAULT_CONFIG.traceId
    const defaultLogsData = generateCorrelatedLogsData({ range, logsEsClient });

    const correlatedLogsData = [
      // Deterministic anchor log (has stable _id for logId lookups)
      generateGetTracesLogsData({
        range,
        logsEsClient,
        config: DEFAULT_TRACE_CONFIGS[0],
      }),
      // Additional trace.id-correlated sequences for direct lookups and anchor expansion
      generateGetTracesLogsData({
        range,
        logsEsClient,
        config: DEFAULT_TRACE_CONFIGS[1],
      }),
    ];

    return [apmData, defaultLogsData, ...correlatedLogsData];
  }
);
