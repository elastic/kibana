/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmOtelFields } from '@kbn/synthtrace-client';
import { appendHash, hashKeysOf } from '@kbn/synthtrace-client';
import { pick } from 'lodash';
import { createLosslessHistogram } from '../../../utils/create_lossless_histogram';

import { createOtelMetricAggregator } from '../create_apm_metric_aggregator';

const KEY_FIELDS: Array<keyof ApmOtelFields> = [
  'attributes.transaction.name',
  'attributes.transaction.result',
  'attributes.transaction.type',
  'attributes.event.outcome',

  'resource.attributes.agent.name',
  'resource.attributes.deployment.environment',
  'resource.attributes.service.namespace',
  'resource.attributes.service.name',
  'resource.attributes.telemetry.sdk.name',
  'resource.attributes.telemetry.sdk.language',
  'resource.attributes.service.instance.id',
  'resource.attributes.process.runtime.name',
  'resource.attributes.process.runtime.version',

  'resource.attributes.telemetry.sdk.language',
  'resource.attributes.telemetry.sdk.version',

  'resource.attributes.host.name',
  'resource.attributes.os.type',
  'resource.attributes.container.id',
  'resource.attributes.k8s.pod.name',

  'resource.attributes.cloud.provider',
  'resource.attributes.cloud.region',
  'resource.attributes.cloud.availability_zone',
  'resource.attributes.cloud.service.name',
  'resource.attributes.cloud.account.id',
  'resource.attributes.cloud.account.name',
  'resource.attributes.cloud.project.id',
  'resource.attributes.cloud.project.name',
  'resource.attributes.cloud.machine.type',

  'resource.attributes.faas.coldstart',
  'resource.attributes.faas.id',
  'resource.attributes.faas.trigger.type',
  'resource.attributes.faas.name',
  'resource.attributes.faas.version',

  'scope.attributes.service.framework.name',
];

const METRICSET_NAME = 'transaction';
export function createTransactionMetricsAggregator(flushInterval: string) {
  return createOtelMetricAggregator(
    {
      filter: (event) => event['attributes.processor.event'] === 'transaction',
      getAggregateKey: (event) => {
        let key = hashKeysOf(event, KEY_FIELDS);
        key = appendHash(key, event.parent_span_id ? '1' : '0');
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
          'attributes.transaction.root': !event.parent_span_id,
          'metrics.transaction.duration.histogram': createLosslessHistogram(),
          'metrics.transaction.duration.summary': {
            value_count: 0,
            sum: 0,
          },
          'metrics.event.success_count': {
            sum: 0,
            value_count: 0,
          },
        };
      },
    },
    (metric, event) => {
      const duration = event['attributes.transaction.duration.us']!;
      metric['metrics.transaction.duration.histogram'].record(duration);

      if (
        event['attributes.event.outcome'] === 'success' ||
        event['attributes.event.outcome'] === 'failure'
      ) {
        metric['metrics.event.success_count'].value_count += 1;
      }

      if (event['attributes.event.outcome'] === 'success') {
        metric['metrics.event.success_count'].sum += 1;
      }

      const summary = metric['metrics.transaction.duration.summary'];

      summary.sum += duration;
      summary.value_count += 1;
    },
    (metric) => {
      const serialized = metric['metrics.transaction.duration.histogram'].serialize();

      metric['metrics.transaction.duration.histogram'] = {
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
