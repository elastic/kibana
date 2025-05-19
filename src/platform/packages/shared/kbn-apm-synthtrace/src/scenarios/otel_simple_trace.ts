/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OtelInstance,
  ApmOtelFields,
  ApmSynthtracePipelineSchema,
} from '@kbn/apm-synthtrace-client';
import { apm } from '@kbn/apm-synthtrace-client/src/lib/apm';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmOtelFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'oteldemo.AdServiceSynth/GetAds';

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
      const failedTimestamps = range.interval('1m').rate(40);

      const instanceSpans = (instance: OtelInstance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .span({
              name: transactionName,
              kind: 'Server',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .dbExitSpan({
                  name: 'GET apm-*/_search',
                  type: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .timestamp(timestamp),
              instance
                .span({
                  name: 'custom_operation',
                  kind: 'Internal',
                })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .span({ name: transactionName, kind: 'Server' })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        return [successfulTraceEvents, failedTraceEvents];
      };

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_otel_trace', () =>
            [otelNativeInstance, edotInstance].flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
