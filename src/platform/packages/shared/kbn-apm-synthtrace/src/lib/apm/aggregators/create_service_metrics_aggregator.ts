/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { hashKeysOf, ApmFields } from '@kbn/apm-synthtrace-client';
import { createLosslessHistogram } from '../../utils/create_lossless_histogram';
import { createApmMetricAggregator } from './create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = [
  'agent.name',
  'service.environment',
  'service.name',
  'transaction.type',
  'service.language.name',
];

export function createServiceMetricsAggregator(flushInterval: string) {
  return createApmMetricAggregator(
    {
      filter: (event) => event['processor.event'] === 'transaction',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/8.10/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event, KEY_FIELDS);
      },
      flushInterval,
      init: (event) => {
        const set = pick(event, KEY_FIELDS);

        return {
          ...set,
          'metricset.name': 'service_transaction',
          'metricset.interval': flushInterval,
          'processor.event': 'metric',
          'processor.name': 'metric',
          'transaction.duration.histogram': createLosslessHistogram(),
          'transaction.duration.summary': {
            value_count: 0,
            sum: 0,
          },
          'event.success_count': {
            sum: 0,
            value_count: 0,
          },
        };
      },
    },
    (metric, event) => {
      const duration = event['transaction.duration.us']!;

      metric['transaction.duration.histogram'].record(duration);

      if (event['event.outcome'] === 'success' || event['event.outcome'] === 'failure') {
        metric['event.success_count'].value_count += 1;
      }

      if (event['event.outcome'] === 'success') {
        metric['event.success_count'].sum += 1;
      }

      const summary = metric['transaction.duration.summary'];

      summary.sum += duration;
      summary.value_count += 1;
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
