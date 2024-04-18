/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, hashKeysOf } from '@kbn/apm-synthtrace-client';
import { pick } from 'lodash';
import { createAssetsAggregatorFactory } from '../../utils/create_assets_aggregator_factory';

const KEY_FIELDS: Array<keyof ApmFields> = ['service.environment', 'service.name'];

export const createAssetsAggregator = createAssetsAggregatorFactory<ApmFields>();

export function createAPMAssetsAggregator() {
  return createAssetsAggregator({
    filter: () => true,
    getAggregateKey: (event) => {
      // see https://github.com/elastic/apm-server/blob/main/x-pack/apm-server/aggregation/txmetrics/aggregator.go
      return hashKeysOf(event, KEY_FIELDS);
    },
    init: (event) => {
      const set = pick(event, KEY_FIELDS);

      return {};
    },
  });
}
