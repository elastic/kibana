/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, hashKeysOf, LogDocument } from '@kbn/apm-synthtrace-client';
import { identity, noop } from 'lodash';
import { assetsAggregatorFactory } from '../../utils/create_assets_aggregator_factory';

export const _createAssetsAggregator = assetsAggregatorFactory<ApmFields | LogDocument>();

const KEY_FIELDS: Array<keyof ApmFields | keyof LogDocument> = ['service.name'];

export function createAssetsAggregator() {
  return _createAssetsAggregator(
    {
      filter: (event) => {
        console.log('### caue  createAssetsAggregator  filter:', event);
        // only uses APM transaction documents
        if ('processor.event' in event) {
          return event['processor.event'] === 'transaction';
        }

        return true;
      },
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        if ('processor.event' in event) {
          return hashKeysOf(event as ApmFields, KEY_FIELDS as Array<keyof ApmFields>);
        }
        return hashKeysOf(event as LogDocument, KEY_FIELDS as Array<keyof LogDocument>);
      },
      init: (event) => {
        return {
          'asset.id': event['service.name']!,
          'asset.type': 'service',
          'asset.identifying_metadata': ['service.name'],
          'asset.signalTypes': ['processor.event' in event ? 'traces' : 'logs'],
          'service.environment':
            'service.environment' in event ? event['service.environment']! : '',
          'service.name': event['service.name']!,
          'service.node.name': 'foo',
          'asset.first_seen': '',
          'asset.last_seen': '',
          'service.language.name':
            'service.language.name' in event ? event['service.language.name']! : '',
        };
      },
    },
    noop,
    identity
  );
}
