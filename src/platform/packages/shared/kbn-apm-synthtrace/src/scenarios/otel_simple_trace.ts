/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelInstance, ApmOtelFields } from '@kbn/apm-synthtrace-client';
import { apmOtel } from '@kbn/apm-synthtrace-client/src/lib/apm';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<ApmOtelFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { otelEsClient } }) => {
      const transactionName = 'oteldemo.AdServiceEdotSynth/GetAds';

      const { logger } = runOptions;

      const edotInstance = apmOtel
        .service({
          name: 'adservice-edot-synth',
          namespace: 'opentelemetry-demo',
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('edot-instance');

      const otelNativeInstance = apmOtel
        .service({
          name: 'sendotlp-otel-native-synth',
          sdkName: 'otlp',
          sdkLanguage: 'nodejs',
        })
        .instance('otel-native-instance');

      const successfulTimestamps = range.interval('1m').rate(180);
      const failedTimestamps = range.interval('1m').rate(40);

      const instanceSpans = (instance: OtelInstance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({
              transactionName,
            })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET /',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
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
          otelEsClient,
          logger.perf('generating_otel_trace', () =>
            [otelNativeInstance, edotInstance].flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
