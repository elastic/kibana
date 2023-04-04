/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BucketAggType, IBucketAggConfig } from './buckets/bucket_agg_type';
import { KBN_FIELD_TYPES } from '../..';

export const legacyAggs = new Map();

legacyAggs.set(
  'geohash_grid',
  () =>
    new BucketAggType<IBucketAggConfig>({
      name: 'geohash_grid',
      expressionName: '',
      title: 'geohash_grid',
      makeLabel: () => 'geohash_grid',
      params: [
        {
          name: 'field',
          type: 'field',
          filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
        },
      ],
      getRequestAggs(agg) {
        return [];
      },
    })
);
