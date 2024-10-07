/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashKeysOf, LogDocument } from '@kbn/apm-synthtrace-client';
import { ServiceAssetDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_assets';
import { identity, noop } from 'lodash';
import { createLogsAssetsAggregator } from './create_logs_assets_aggregator';

const KEY_FIELDS: Array<keyof LogDocument> = ['service.name'];

export function createLogsServiceAssetsAggregator() {
  return createLogsAssetsAggregator<ServiceAssetDocument>(
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
          'asset.first_seen': firstSeen,
          'asset.last_seen': lastSeen,
          'asset.signalTypes': {
            'asset.logs': true,
          },
          'service.name': event['service.name']!,
        };
      },
    },
    noop,
    identity
  );
}
