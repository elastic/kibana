/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { ServiceEntityDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_entities';
import { createPivotTransform } from '../../utils/create_pivot_transform';
import { createTracesEntitiesAggregator } from './create_traces_assets_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = ['service.name'];

export function createTracesServiceEntitiesAggregator() {
  return createTracesEntitiesAggregator<ServiceEntityDocument>(
    {
      filter: (event) => event['processor.event'] === 'transaction',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event as ApmFields, KEY_FIELDS as Array<keyof ApmFields>);
      },
      init: (event, firstSeen, lastSeen) => {
        return {
          'entity.id': `${event['service.name']}`,
          'entity.identity.service.environment': event['service.environment'],
          'entity.identity.service.name': event['service.name']!,
          'entity.latestTimestamp': lastSeen,
          'entity.firstSeen': firstSeen,
          'entity.indexPatterns': ['metrics-*'],
          'entity.data_stream.type': ['metrics'],
          'entity.agent.name': event['agent.name'],
          'entity.metric.latency': createPivotTransform(),
          'entity.metric.failedTransactionRate': createPivotTransform(),
          'entity.metric.throughput': createPivotTransform(),
        };
      },
    },
    (entity, event) => {
      const entityId = entity['entity.id'];
      const duration = event['transaction.duration.us']!;
      const outcome = event['event.outcome'];

      // @ts-expect-error
      entity['entity.metric.latency'].record({ groupBy: entityId, value: duration });
      // @ts-expect-error
      entity['entity.metric.failedTransactionRate'].record({
        groupBy: entityId,
        value: outcome === 'failure' ? 0 : 1,
      });

      // @ts-expect-error
      entity['entity.metric.latency'].record({ groupBy: entityId, value: duration });
    },
    (entity) => {
      const entityId = entity['entity.id'];
      // @ts-expect-error
      const latency = entity['entity.metric.latency'].avg({ key: entityId });
      // @ts-expect-error
      const failedTransactionRate = entity['entity.metric.failedTransactionRate'].rate({
        key: entityId,
        type: 0,
      });

      entity['entity.metric.latency'] = latency.value;
      entity['entity.metric.failedTransactionRate'] = failedTransactionRate.value;
      console.log('latency', latency);
      entity['entity.metric.throughput'] = latency.total / (5 / 1000 / 60);
      return entity;
    }
  );
}
