/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { ServiceEntityDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_entities';
import { identity, noop } from 'lodash';
import { createTracesAssetsAggregator } from './create_traces_assets_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = ['service.name'];

export function createTracesServiceEntitiesAggregator() {
  return createTracesAssetsAggregator<ServiceEntityDocument>(
    {
      filter: (event) => event['processor.event'] === 'transaction',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event as ApmFields, KEY_FIELDS as Array<keyof ApmFields>);
      },
      init: (event, firstSeen, lastSeen) => {
        return {
          'entity.id': `${event['service.name']}:${event['service.environment']}`,
          'entity.identity.service.environment': event['service.environment'],
          'entity.identity.service.name': event['service.name']!,
          'entity.latestTimestamp': lastSeen,
          'entity.firstSeen': firstSeen,
          'entity.indexPatterns': ['metrics-*'],
          'entity.data_stream.type': ['metrics'],
          'entity.agent.name': event['agent.name'],
        };
      },
    },
    noop,
    identity
  );
}
