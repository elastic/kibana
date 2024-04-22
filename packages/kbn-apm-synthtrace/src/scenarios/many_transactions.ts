/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { random, times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { numServices = 1 } = runOptions.scenarioOpts || {};
  const numTransactions = 2000;

  const transactionNames = ['GET', 'PUT', 'DELETE', 'UPDATE'].flatMap((method) =>
    [
      '/users',
      '/products',
      '/orders',
      '/customers',
      '/profile',
      '/categories',
      '/invoices',
      '/payments',
      '/cart',
      '/reviews',
    ].map((resource) => `${method} ${resource}`)
  );

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = times(numServices).map((index) =>
        apm
          .service({
            name: `synthtrace-high-cardinality-${index}`,
            environment: ENVIRONMENT,
            agentName: 'java',
          })
          .instance(`instance-${index}`)
      );

      const instanceSpans = (instance: Instance, transactionName: string) => {
        const successfulTraceEvents = range
          .ratePerMinute(random(1, 60))
          .generator((timestamp) =>
            instance
              .transaction({ transactionName })
              .timestamp(timestamp)
              .duration(random(100, 10_000))
              .success()
          );

        const failedTraceEvents = range.ratePerMinute(random(1, 60)).generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(random(100, 10_000))
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                  culprit: 'elasticsearch',
                })
                .timestamp(timestamp + 50)
            )
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [successfulTraceEvents, failedTraceEvents, metricsets];
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances.flatMap((instance) =>
            times(numTransactions)
              .map((index) => `${transactionNames[index % transactionNames.length]}-${index}`)
              .flatMap((transactionName) => instanceSpans(instance, transactionName))
          )
        )
      );
    },
  };
};

export default scenario;
