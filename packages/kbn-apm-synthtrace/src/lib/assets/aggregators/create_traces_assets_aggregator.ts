/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { identity, noop } from 'lodash';
import { assetsAggregatorFactory } from '../../utils/create_assets_aggregator_factory';

export const createAssetsAggregator = assetsAggregatorFactory<ApmFields>();

const KEY_FIELDS: Array<keyof ApmFields> = ['service.name'];

export function createTracesAssetsAggregator() {
  return createAssetsAggregator(
    {
      filter: (event) => event['processor.event'] === 'transaction',

      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event as ApmFields, KEY_FIELDS as Array<keyof ApmFields>);
      },
      init: (event, firstSeen, lastSeen) => {
        return {
          'asset.id': event['service.name']!,
          'asset.type': 'service',
          'asset.identifying_metadata': ['service.name'],
          'asset.signalTypes': ['traces'],
          'service.environment': event['service.environment']!,
          'service.name': event['service.name']!,
          'service.node.name': event['service.node.name'] || '',
          'asset.first_seen': firstSeen,
          'asset.last_seen': lastSeen,
          'service.language.name': event['service.language.name'] || '',
        };
      },
    },
    noop,
    identity
  );
}
