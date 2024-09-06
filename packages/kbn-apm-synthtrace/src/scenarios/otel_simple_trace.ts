/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, otel, generateShortId } from '@kbn/apm-synthtrace-client';
import { times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { otelSynthtraceEsClient } }) => {
      const { numOtelTraces = 5 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

      const otelDocs = times(numOtelTraces / 2).map((index) => otel.create());

      const otelWithMetricsAndErrors = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          otelDocs.flatMap((oteld) => {
            const id = generateShortId();
            return [
              oteld.metric(id).timestamp(timestamp),
              oteld.transaction(id).timestamp(timestamp),
              oteld.error(id).timestamp(timestamp),
            ];
          })
        );

      return [
        withClient(
          otelSynthtraceEsClient,
          logger.perf('generating_otel_otelTrace', () => otelWithMetricsAndErrors)
        ),
      ];
    },
  };
};

export default scenario;
