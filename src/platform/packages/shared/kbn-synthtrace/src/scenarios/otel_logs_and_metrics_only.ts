/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates OpenTelemetry logs and metrics, but no traces.
 */

import type { OtelLogDocument } from '@kbn/synthtrace-client';
import {
  generateLongId,
  generateShortId,
  otelLog,
  apm,
  ApmSynthtracePipelineSchema,
} from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';

const MESSAGE_LOG_LEVELS = [
  {
    message: 'A simple log with something random <random> in the middle',
    level: 'info',
    severityNumber: 9,
  },
  { message: 'Yet another debug log', level: 'debug', severityNumber: 5 },
  {
    message: 'Error with certificate: "ca_trusted_fingerprint"',
    level: 'error',
    severityNumber: 17,
  },
];

const scenario: Scenario<OtelLogDocument> = async (runOptions) => {
  const { logger } = runOptions;

  const constructLogsCommonData = () => {
    const index = Math.floor(Math.random() * 3);
    const serviceName = 'otel-metrics-and-logs-only';
    const logMessage = MESSAGE_LOG_LEVELS[index];

    const commonLongEntryFields: OtelLogDocument = {
      trace_id: generateLongId(),
      resource: {
        attributes: {
          'service.name': serviceName,
          'service.version': '1.0.0',
          'service.environment': 'production',
        },
      },
      attributes: {
        'log.file.path': `/logs/${generateLongId()}/error.txt`,
      },
    };

    return {
      index,
      serviceName,
      logMessage,
      commonLongEntryFields,
    };
  };

  return {
    bootstrap: async ({ logsEsClient }) => {
      await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient, apmEsClient } }) => {
      const {
        logMessage: { level, message },
        commonLongEntryFields,
        serviceName,
      } = constructLogsCommonData();

      const metricsets = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          apm
            .otelService({
              name: serviceName,
              sdkName: 'opentelemetry',
              sdkLanguage: 'synthtrace',
              namespace: 'production',
            })
            .instance('instance-1')
            .appMetrics({
              'system.memory.actual.free': 800,
              'system.memory.total': 1000,
              'system.cpu.total.norm.pct': 0.6,
              'system.process.cpu.total.norm.pct': 0.7,
            })
            .timestamp(timestamp)
        );

      const apmAndLogsLogsEvents = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              return otelLog
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .defaults(commonLongEntryFields)
                .timestamp(timestamp);
            });
        });
      return [
        withClient(
          logsEsClient,
          logger.perf('generating_otel_logs', () => apmAndLogsLogsEvents)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_metrics', () => metricsets)
        ),
      ];
    },
    setupPipeline({ apmEsClient }) {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
