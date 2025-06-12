/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmOtelFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { identity, noop, pick } from 'lodash';
import { createOtelMetricAggregator } from '../create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmOtelFields> = [
  'resource.attributes.agent.name',
  'resource.attributes.deployment.environment',
  'resource.attributes.service.name',
  'resource.attributes.telemetry.sdk.name',
  'resource.attributes.telemetry.sdk.language',
  'scope.attributes.service.framework.name',
];

const METRICSET_NAME = 'service_summary';
export function createServiceSummaryMetricsAggregator(flushInterval: string) {
  return createOtelMetricAggregator(
    {
      filter: () => true,
      getAggregateKey: (event) => {
        return hashKeysOf(event, KEY_FIELDS);
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
        };
      },
    },
    noop,
    identity
  );
}
