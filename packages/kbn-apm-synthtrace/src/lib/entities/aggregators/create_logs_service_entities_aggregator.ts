/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hashKeysOf, LogDocument } from '@kbn/apm-synthtrace-client';
import { ServiceEntityDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_entities';
import { identity, noop } from 'lodash';
import { createPivotTransform } from '../../utils/create_pivot_transform';
import { createLogsAssetsAggregator } from './create_logs_assets_aggregator';

const KEY_FIELDS: Array<keyof LogDocument> = ['service.name'];

export function createLogsServiceEntitiesAggregator() {
  return createLogsAssetsAggregator<ServiceEntityDocument>(
    {
      filter: (event) => event['input.type'] === 'logs',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event as LogDocument, KEY_FIELDS as Array<keyof LogDocument>);
      },
      init: (event, firstSeen, lastSeen) => {
        return {
          'entity.id': `${event['service.name']}`,
          'entity.identity.service.name': event['service.name']!,
          'entity.latestTimestamp': lastSeen,
          'entity.indexPatterns': ['logs-*'],
          'entity.data_stream.type': ['logs'],
          'entity.firstSeen': firstSeen,
          'entity.metric.logErrorRate': createPivotTransform(),
          'entity.metric.logRatePerMinute': createPivotTransform(),
        };
      },
    },
    (entity, event) => {
      const entityId = entity['entity.id'];
      const logLever = event['log.level']!;

      // @ts-expect-error
      entity['entity.metric.logErrorRate'].record({
        groupBy: entityId,
        value: logLever === 'error' ? 0 : 1,
      });
    },
    (entity) => {
      const entityId = entity['entity.id'];
      // @ts-expect-error
      const logErrorRate = entity['entity.metric.logErrorRate'].rate({
        key: entityId,
        type: 0,
      });

      entity['entity.metric.logErrorRate'] = logErrorRate.value;
      return entity;
    }
  );
}
