/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { range as lodashRange } from 'lodash';
import { apm } from '../..';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { ApmFields } from '../lib/apm/apm_fields';

const scenario: Scenario<ApmFields> = async ({ logger }) => {
  return {
    generate: ({ range }) => {
      logger.info('Loaded scenario');

      const NUM_SERVICES = 50;
      const NUM_SERVICE_NODES = 25;
      const NUM_TRANSACTION_GROUPS = 25;
      const TRANSACTION_TYPES = ['request', 'custom'];
      const ENVIRONMENTS = ['production', 'development'];

      const MIN_DURATION = 10;
      const MAX_DURATION = 1000;

      const MAX_BUCKETS = 50;

      const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

      const OUTCOMES = ['success' as const, 'failure' as const, 'unknown' as const];

      const instances = lodashRange(0, NUM_SERVICES).flatMap((serviceId) => {
        const serviceName = `service-${serviceId}`;

        const services = ENVIRONMENTS.map((env) => apm.service(serviceName, env, 'go'));

        return lodashRange(0, NUM_SERVICE_NODES).flatMap((serviceNodeId) =>
          services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
        );
      });

      const downstream = apm.service('downstream', 'downstream', 'go').instance('downstream');

      const transactionGroupRange = lodashRange(0, NUM_TRANSACTION_GROUPS);

      return range
        .interval('1m')
        .rate(10)
        .generator((timestamp) => {
          logger.info('Generating data for ' + new Date(timestamp).toISOString());

          const events = instances.flatMap((instance) =>
            transactionGroupRange.flatMap((groupId, groupIndex) =>
              OUTCOMES.map((outcome, outcomeIndex) => {
                const index = groupIndex * outcomeIndex;
                const duration = Math.round((index % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION);

                return instance
                  .transaction(
                    `transaction-${groupId}`,
                    TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length]
                  )
                  .timestamp(timestamp)
                  .duration(duration)
                  .outcome(outcome)
                  .children(
                    instance
                      .span('downstream', 'external', 'http')
                      .timestamp(timestamp)
                      .duration(duration)
                      .outcome(outcome)
                  );
              })
            )
          );

          logger.info('Done generating');

          return events;
        });
    },
  };
};

export default scenario;
