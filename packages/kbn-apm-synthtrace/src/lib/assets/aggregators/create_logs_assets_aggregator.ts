/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hashKeysOf, LogDocument } from '@kbn/apm-synthtrace-client';
import { identity, noop } from 'lodash';
import { createAssetsAggregatorFactory } from '../../utils/create_assets_aggregator_factory';

export const createAssetsAggregator = createAssetsAggregatorFactory<LogDocument>();

const KEY_FIELDS: Array<keyof LogDocument> = ['service.name'];

export function createLogsAssetsAggregator() {
  return createAssetsAggregator(
    {
      filter: (event) => event['input.type'] === 'logs',
      getAggregateKey: (event) => {
        // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
        return hashKeysOf(event as LogDocument, KEY_FIELDS as Array<keyof LogDocument>);
      },
      init: (event, firstSeen, lastSeen) => {
        return {
          'asset.id': event['service.name']!,
          'asset.type': 'service',
          'asset.identifying_metadata': ['service.name'],
          'asset.has_logs': true,
          'asset.first_seen': firstSeen,
          'asset.last_seen': lastSeen,
          'service.name': event['service.name']!,
        };
      },
    },
    noop,
    identity
  );
}
