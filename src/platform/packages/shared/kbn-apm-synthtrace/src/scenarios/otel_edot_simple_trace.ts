/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateShortId, OtelEdotDocument, otelEdot } from '@kbn/apm-synthtrace-client';
import { times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<OtelEdotDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { otelEsClient } }) => {
      const { numOtelTraces = 5 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;
      const traceId = generateShortId();
      const spanId = generateShortId();

      const otelEdotDocs = times(numOtelTraces / 2).map((index) => otelEdot.create(traceId));

      const otelWithMetricsAndErrors = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          otelEdotDocs.flatMap((otelEdotd) => {
            return [
              otelEdotd.metric().timestamp(timestamp),
              otelEdotd.transaction(spanId).timestamp(timestamp),
            ];
          })
        );

      return [
        withClient(
          otelEsClient,
          logger.perf('generating_otel_trace', () => otelWithMetricsAndErrors)
        ),
      ];
    },
  };
};

export default scenario;
