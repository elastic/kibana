/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields } from '@kbn/apm-synthtrace-client';
import { identity, negate } from 'lodash';
import { createFilterTransform, fork } from '../../utils/stream_utils';
import { createApmMetricAggregator } from './create_apm_metric_aggregator';

const filter = (event: ApmFields) =>
  event['processor.event'] === 'metric' && event['metricset.name'] === 'span_breakdown';

export function createBreakdownMetricsAggregator(flushInterval: string) {
  const dropProcessedEventsStream = createFilterTransform(negate(filter));

  const aggregatorStream = createApmMetricAggregator(
    {
      filter,
      getAggregateKey: (event) => {
        return event.meta!['metricset.id'];
      },
      flushInterval,
      init: (event) => {
        return {
          ...event,
          meta: {},
          'span.self_time.count': 0,
          'span.self_time.sum.us': 0,
        };
      },
    },
    (metric, event) => {
      metric['span.self_time.count'] += event['span.self_time.count']!;
      metric['span.self_time.sum.us'] += event['span.self_time.sum.us']!;
    },
    identity
  );

  const mergedStreams = fork(dropProcessedEventsStream, aggregatorStream);

  return mergedStreams;
}
