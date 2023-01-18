/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge, range as lodashRange } from 'lodash';
import { PassThrough, pipeline, Transform } from 'stream';
import { apm, ApmFields, ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { createServiceMetricsAggregator } from '../lib/apm/aggregators/create_service_metrics_aggregator';
import { createTransactionMetricsAggregator } from '../lib/apm/aggregators/create_transaction_metrics_aggregator';
import { ComponentTemplateName } from '../lib/apm/client/apm_synthtrace_es_client';
import { getApmServerMetadataTransform } from '../lib/apm/client/apm_synthtrace_es_client/get_apm_server_metadata_transform';
import { getDedotTransform } from '../lib/apm/client/apm_synthtrace_es_client/get_dedot_transform';
import { getIntakeDefaultsTransform } from '../lib/apm/client/apm_synthtrace_es_client/get_intake_defaults_transform';
import { getSerializeTransform } from '../lib/apm/client/apm_synthtrace_es_client/get_serialize_transform';
import { fork } from '../lib/utils/stream_utils';

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
            mappings: {
              properties: {
                event: {
                  properties: {
                    outcome_numeric: {
                      type: 'aggregate_metric_double',
                      metrics: ['sum', 'value_count'],
                      default_metric: 'sum',
                    },
                  },
                },
                transaction: {
                  properties: {
                    duration: {
                      properties: {
                        summary: {
                          type: 'aggregate_metric_double',
                          metrics: ['min', 'max', 'sum', 'value_count'],
                          default_metric: 'max',
                        },
                      },
                    },
                  },
                },
                metricset: {
                  properties: {
                    interval: {
                      type: 'constant_keyword' as const,
                    },
                  },
                },
              },
            },
          };

          return merge({}, template, next);
        }
      );

      function withInterval(cb: (flushInterval: string) => Transform, flushInterval: string) {
        const aggregator = cb(flushInterval);

        aggregator.pipe(
          new PassThrough({
            objectMode: true,
            write(metric: ApmFields, encoding, callback) {
              metric['metricset.interval'] = flushInterval;
              callback();
            },
          })
        );

        return aggregator;
      }

      const aggregators = [
        withInterval(createServiceMetricsAggregator, '1m'),
        withInterval(createServiceMetricsAggregator, '10m'),
        withInterval(createServiceMetricsAggregator, '60m'),
        withInterval(createTransactionMetricsAggregator, '1m'),
        withInterval(createTransactionMetricsAggregator, '10m'),
        withInterval(createTransactionMetricsAggregator, '60m'),
      ];

      apmEsClient.pipeline((base) => {
        return pipeline(
          base,
          getSerializeTransform(),
          getIntakeDefaultsTransform(),
          fork(...aggregators),
          new Transform({
            objectMode: true,
            transform(event: ESDocumentWithOperation<ApmFields>, encoding, callback) {
              const index = `metrics-apm.internal-${
                event['metricset.name'] === 'transaction' ? 'transaction' : 'service'
              }.${event['metricset.interval']}`;
              event._index = index;
              callback(null, event);
            },
          }),
          getApmServerMetadataTransform(apmEsClient.getVersion()),
          getDedotTransform(),
          (err) => {
            if (err) {
              logger.error(err);
            }
          }
        );
      });
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
