/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { ServiceAssetDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_assets';
import { identity, noop } from 'lodash';
import { createTracesAssetsAggregator } from './create_traces_assets_aggregator';

const KEY_FIELDS: Array<keyof ApmFields> = ['service.name'];

export function createTracesServiceAssetsAggregator() {
  return createTracesAssetsAggregator<ServiceAssetDocument>(
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
          'asset.first_seen': firstSeen,
          'asset.last_seen': lastSeen,
          'asset.signalTypes': {
            'asset.traces': true,
          },
          'service.environment': event['service.environment'],
          'service.name': event['service.name']!,
          'service.node.name': event['service.node.name'],
          'service.language.name': event['service.language.name'],
        };
      },
    },
    noop,
    identity
  );
}
