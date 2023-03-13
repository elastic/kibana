/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields } from '@kbn/apm-synthtrace-client';
import { merge, range as lodashRange } from 'lodash';
import { Scenario } from '../cli/scenario';
import { ComponentTemplateName } from '../lib/apm/client/apm_synthtrace_es_client';

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const {
    services: numServices = 25,
    instances: numInstances = 10,
    txGroups: numTxGroups = 25,
  } = scenarioOpts ?? {};

  return {
    bootstrap: async ({ apmEsClient }) => {
      await apmEsClient.updateComponentTemplate(
        ComponentTemplateName.MetricsInternal,
        (template) => {
          const next = {
            settings: {
              index: {
                number_of_shards: 8,
              },
            },
          };

          return merge({}, template, next);
        }
      );
    },
    generate: ({ range }) => {
      const TRANSACTION_TYPES = ['request', 'custom'];
      const ENVIRONMENTS = ['production', 'development'];

      const MIN_DURATION = 10;
      const MAX_DURATION = 1000;

      const MAX_BUCKETS = 50;

      const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

      const OUTCOMES = ['success' as const, 'failure' as const, 'unknown' as const];

      const instances = lodashRange(0, numServices).flatMap((serviceId) => {
        const serviceName = `service-${serviceId}`;

        const services = ENVIRONMENTS.map((env) => apm.service(serviceName, env, 'go'));

        return lodashRange(0, numInstances).flatMap((serviceNodeId) =>
          services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
        );
      });

      const transactionGroupRange = lodashRange(0, numTxGroups);

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp, timestampIndex) => {
          return logger.perf(
            'generate_events_for_timestamp ' + new Date(timestamp).toISOString(),
            () => {
              const events = instances.flatMap((instance) =>
                transactionGroupRange.flatMap((groupId, groupIndex) =>
                  OUTCOMES.map((outcome) => {
                    const duration = Math.round(
                      (timestampIndex % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION
                    );

                    return instance
                      .transaction(
                        `transaction-${groupId}`,
                        TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length]
                      )
                      .timestamp(timestamp)
                      .duration(duration)
                      .outcome(outcome);
                  })
                )
              );

              return events;
            }
          );
        });
    },
  };
};

export default scenario;
