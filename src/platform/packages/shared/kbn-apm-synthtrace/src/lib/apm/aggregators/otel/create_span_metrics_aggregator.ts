/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { ApmOtelFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { createOtelMetricAggregator } from '../create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmOtelFields> = [
  'resource.attributes.agent.name',
  'resource.attributes.service.name',
  'resource.attributes.deployment.environment',
  'resource.attributes.service.instance.id',
  'resource.attributes.telemetry.sdk.name',
  'resource.attributes.telemetry.sdk.language',
  'attributes.span.destination.service.resource',
  'attributes.event.outcome',
  'attributes.span.name',
  'attributes.service.target.name',
  'attributes.service.target.type',
  'scope.attributes.service.framework.name',
];

const METRICSET_NAME = 'service_destination';
export function createSpanMetricsAggregator(flushInterval: string) {
  return createOtelMetricAggregator(
    {
      filter: (event) =>
        event['attributes.processor.event'] === 'span' &&
        !!event['attributes.span.destination.service.resource'],
      getAggregateKey: (event) => {
        const key = hashKeysOf(event, KEY_FIELDS);
        return key;
      },
      flushInterval,
      init: (event) => {
        const set = pick(event, KEY_FIELDS);

        return {
          ...set,
          'data_stream.dataset': `${METRICSET_NAME}.${flushInterval}.otel`,
          'data_stream.namespace': 'default',
          'data_stream.type': 'metrics',
          'attributes.metricset.name': METRICSET_NAME,
          'attributes.metricset.interval': flushInterval,
          'attributes.processor.event': 'metric',
          'processor.event': 'metric',
          'metrics.span.destination.service.response_time.count': 0,
          'metrics.span.destination.service.response_time.sum.us': 0,
        };
      },
    },
    (metric, event) => {
      metric['metrics.span.destination.service.response_time.count'] += 1;
      metric['metrics.span.destination.service.response_time.sum.us'] +=
        event['attributes.span.duration.us']!;
    },
    (metric) => {
      // @ts-expect-error
      metric._doc_count = metric['span.destination.service.response_time.count'];

      return metric;
    }
  );
}
