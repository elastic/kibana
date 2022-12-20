/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, appendHash, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { pick } from 'lodash';
import { createLosslessHistogram } from '../../utils/create_lossless_histogram';
import { createApmMetricAggregator } from './create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = [
  'transaction.name',
  'transaction.result',
  'transaction.type',
  'event.outcome',

  'agent.name',
  'service.environment',
  'service.name',
  'service.version',
  'service.node.name',
  'service.runtime.name',
  'service.runtime.version',

  'service.language.name',
  'service.language.version',

  'host.hostname',
  'host.name',
  'host.os.platform',
  'container.id',
  'kubernetes.pod.name',

  'cloud.provider',
  'cloud.region',
  'cloud.availability_zone',
  'cloud.service.name',
  'cloud.account.id',
  'cloud.account.name',
  'cloud.project.id',
  'cloud.project.name',
  'cloud.machine.type',

  'faas.coldstart',
  'faas.id',
  'faas.trigger.type',
  'faas.name',
  'faas.version',
];

export function createTransactionMetricsAggregator(flushInterval: string) {
  return createApmMetricAggregator(
    {
      filter: (event) => event['processor.event'] === 'transaction',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        let key = hashKeysOf(event, KEY_FIELDS);
        key = appendHash(key, event['parent.id'] ? '1' : '0');
        return key;
      },
      flushInterval,
      init: (event) => {
        const set = pick(event, KEY_FIELDS);

        return {
          ...set,
          'metricset.name': 'transaction',
          'processor.event': 'metric',
          'processor.name': 'metric',
          'transaction.root': !event['parent.id'],
          'transaction.duration.histogram': createLosslessHistogram(),
        };
      },
    },
    (metric, event) => {
      metric['transaction.duration.histogram'].record(event['transaction.duration.us']!);
    },
    (metric) => {
      const serialized = metric['transaction.duration.histogram'].serialize();
      metric['transaction.duration.histogram'] = {
        // @ts-expect-error
        values: serialized.values,
        counts: serialized.counts,
      };
      // @ts-expect-error
      metric._doc_count = serialized.total;
      return metric;
    }
  );
}
