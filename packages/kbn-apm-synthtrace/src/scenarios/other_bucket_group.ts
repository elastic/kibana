/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { apm, ApmFields } from '@kbn/apm-synthtrace-client';
import { range as lodashRange } from 'lodash';
import { Scenario } from '../cli/scenario';

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const { services: numServices = 10, txGroups: numTxGroups = 10 } = scenarioOpts ?? {};

  return {
    generate: ({ range }) => {
      const TRANSACTION_TYPES = ['request'];
      const ENVIRONMENTS = ['production', 'development'];

      const OVERFLOW_BUCKET_NAME = '_other';

      const MIN_DURATION = 10;
      const MAX_DURATION = 1000;

      const MAX_BUCKETS = 50;

      const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

      const serviceRange = [
        ...lodashRange(0, numServices).map((groupId) => `service-${groupId}`),
        OVERFLOW_BUCKET_NAME,
      ];

      const overflowCountConfig: Record<string, number> = {
        [OVERFLOW_BUCKET_NAME]: 20,
      };

      const instances = serviceRange.flatMap((serviceName) => {
        const services = ENVIRONMENTS.map((env) =>
          apm.service({
            name: serviceName,
            environment: env,
            agentName: 'go',
            'service_transaction.aggregation.overflow_count': overflowCountConfig[serviceName] ?? 0,
          })
        );

        return lodashRange(0, 2).flatMap((serviceNodeId) =>
          services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
        );
      });

      const transactionGroupRange = [
        ...lodashRange(0, numTxGroups).map((groupId) => `transaction-${groupId}`),
        OVERFLOW_BUCKET_NAME,
      ];

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp, timestampIndex) => {
          return logger.perf(
            'generate_events_for_timestamp ' + new Date(timestamp).toISOString(),
            () => {
              const events = instances.flatMap((instance) =>
                transactionGroupRange.flatMap((groupId, groupIndex) => {
                  const duration = Math.round(
                    (timestampIndex % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION
                  );

                  if (groupId === OVERFLOW_BUCKET_NAME) {
                    return instance
                      .transaction(groupId)
                      .timestamp(timestamp)
                      .duration(duration)
                      .defaults({
                        'transaction.aggregation.overflow_count': 10,
                      });
                  }

                  return instance
                    .transaction(groupId, TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length])
                    .timestamp(timestamp)
                    .duration(duration)
                    .success();
                })
              );

              return events;
            }
          );
        });
    },
  };
};

export default scenario;
