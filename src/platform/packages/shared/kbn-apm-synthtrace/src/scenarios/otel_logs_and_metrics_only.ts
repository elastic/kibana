/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelInstance, ApmOtelFields } from '@kbn/apm-synthtrace-client';
import { apm } from '@kbn/apm-synthtrace-client/src/lib/apm';
import { LogLevel } from '@kbn/apm-synthtrace-client/src/lib/apm/otel/otel_log';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { time } from 'console';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmOtelFields> = async (runOptions) => {
  return {
    bootstrap: async ({ apmEsClient }) => {
      apmEsClient.pipeline(apmEsClient.getPipeline('otelToApm'));
    },
    generate: ({ range, clients: { apmEsClient } }) => {

      const { logger } = runOptions;

      const edotInstance = apm
        .otelService({
          name: 'adservice-edot-synth',
          namespace: ENVIRONMENT,
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('edot-instance');

      const otelNativeInstance = apm
        .otelService({
          name: 'sendotlp-otel-native-synth',
          namespace: ENVIRONMENT,
          sdkName: 'otlp',
          sdkLanguage: 'nodejs',
        })
        .instance('otel-native-instance');

      const successfulTimestamps = range.interval('1m').rate(180);

      const instanceSpans = (instance: OtelInstance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .log({
              message: 'hello, world',
              logLevel: LogLevel.DEBUG,
            })
            .timestamp(timestamp)
        );

        return [successfulTraceEvents];
      };

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_otel_logs', () =>
            [otelNativeInstance, edotInstance].flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
