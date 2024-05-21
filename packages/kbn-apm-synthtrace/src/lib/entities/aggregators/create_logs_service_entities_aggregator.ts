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
          'entity.id': `${event['service.name']}:${event['service.environment']!}`,
          'entity.identity': {
            'service: environment': event['service.environment'],
            'service.name': event['service.name']!,
          },
          'entity.latestTimestamp': lastSeen,
          'entity.indexPatterns': ['logs-*'],
        };
      },
    },
    noop,
    identity
  );
}
