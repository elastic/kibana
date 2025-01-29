/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { createApmMetricAggregator } from './create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = [
  'agent.name',
  'service.name',
  'service.environment',
  'span.destination.service.resource',
  'event.outcome',
  'span.name',
  'service.target.name',
  'service.target.type',
];

export function createSpanMetricsAggregator(flushInterval: string) {
  return createApmMetricAggregator(
    {
      filter: (event) =>
        event['processor.event'] === 'span' && !!event['span.destination.service.resource'],
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/8.10/x-pack/apm-server/aggregation/spanmetrics/aggregator.go
        const key = hashKeysOf(event, KEY_FIELDS);
        return key;
      },
      flushInterval,
      init: (event) => {
        const set = pick(event, KEY_FIELDS);

        return {
          ...set,
          'metricset.name': 'service_destination',
          'metricset.interval': flushInterval,
          'processor.event': 'metric',
          'processor.name': 'metric',
          'span.destination.service.response_time.count': 0,
          'span.destination.service.response_time.sum.us': 0,
        };
      },
    },
    (metric, event) => {
      metric['span.destination.service.response_time.count'] += 1;
      metric['span.destination.service.response_time.sum.us'] += event['span.duration.us']!;
    },
    (metric) => {
      // @ts-expect-error
      metric._doc_count = metric['span.destination.service.response_time.count'];
      return metric;
    }
  );
}
