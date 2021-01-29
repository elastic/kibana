/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { GeoBoundingBox } from './lib/geo_point';
import { aggFilterFnName } from './filter_fn';
import { BaseAggParams } from '../types';

const filterTitle = i18n.translate('data.search.aggs.buckets.filterTitle', {
  defaultMessage: 'Filter',
});

export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
}

export const getFilterBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.FILTER,
    expressionName: aggFilterFnName,
    title: filterTitle,
    makeLabel: () => filterTitle,
    params: [
      {
        name: 'geo_bounding_box',
      },
    ],
  });
