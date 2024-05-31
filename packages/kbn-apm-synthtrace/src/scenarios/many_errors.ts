/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, apm } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { getExceptionTypeForIndex } from './helpers/exception_types';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
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
          const severity = severities[index % severities.length];
          const errorMessage = `${severity}: ${getRandomNameForIndex(index)} ${index}`;
          return instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: errorMessage,
                  type: getExceptionTypeForIndex(index),
                  culprit: 'request (node_modules/@elastic/transport/src/Transport.ts)',
                })
                .timestamp(timestamp + 50)
            );
        });

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => failedTraceEvents)
      );
    },
  };
};

export default scenario;
