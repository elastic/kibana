/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a high volume of APM error documents with varied messages and types.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { getExceptionTypeForIndex } from './helpers/exception_types';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { withoutErrorId = false } = runOptions.scenarioOpts;

  const severities = ['critical', 'error', 'warning', 'info', 'debug', 'trace'];

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'DELETE /api/orders/{id}';

      const instance = apm
        .service({
          name: `synthtrace-high-cardinality-0`,
          environment: ENVIRONMENT,
          agentName: 'java',
        })
        .instance('instance');

      const failedTraceEvents = range
        .interval('1m')
        .rate(2000)
        .generator((timestamp, index) => {
          const errors = Array.from({ length: 10 }, (_, errorIndex) => {
            const severity = severities[errorIndex % severities.length];
            const errorMessage = `${severity}: ${getRandomNameForIndex(index)}`;

            return instance
              .error({
                message: errorMessage + ` ${errorIndex}`,
                type: getExceptionTypeForIndex(index + errorIndex),
                culprit: 'request (node_modules/@elastic/transport/src/Transport.ts)',
                withoutErrorId,
              })
              .timestamp(timestamp + 50 * (errorIndex + 1)); // Stagger error timestamps
          });

          return instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(...errors);
        });

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => failedTraceEvents)
      );
    },
  };
};

export default scenario;
