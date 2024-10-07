/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
<<<<<<< HEAD
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, otel, generateShortId } from '@kbn/apm-synthtrace-client';
=======
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { otel, generateShortId, OtelDocument } from '@kbn/apm-synthtrace-client';
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
import { times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

<<<<<<< HEAD
const scenario: Scenario<ApmFields> = async (runOptions) => {
=======
const scenario: Scenario<OtelDocument> = async (runOptions) => {
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
  return {
    generate: ({ range, clients: { otelSynthtraceEsClient } }) => {
      const { numOtelTraces = 5 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;
<<<<<<< HEAD

      const otelDocs = times(numOtelTraces / 2).map((index) => otel.create());
=======
      const traceId = generateShortId();
      const spanId = generateShortId();

      const otelDocs = times(numOtelTraces / 2).map((index) => otel.create(traceId));
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5

      const otelWithMetricsAndErrors = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          otelDocs.flatMap((oteld) => {
<<<<<<< HEAD
            const id = generateShortId();
            return [
              oteld.metric(id).timestamp(timestamp),
              oteld.transaction(id).timestamp(timestamp),
              // oteld.error(id).timestamp(timestamp),
=======
            return [
              oteld.metric().timestamp(timestamp),
              oteld.transaction(spanId).timestamp(timestamp),
              oteld.error(spanId).timestamp(timestamp),
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
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
