/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildRangeFilter, RangeFilterParams } from '../../../../../common';
import { AggTypesDependencies } from '../../agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';

/** @internal */
export const createFilterHistogram = (
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart']
) => {
  return (aggConfig: IBucketAggConfig, key: string) => {
    const { deserialize } = getFieldFormatsStart();
    const value = parseInt(key, 10);
    const params: RangeFilterParams = { gte: value, lt: value + aggConfig.params.interval };

    return buildRangeFilter(
      aggConfig.params.field,
      params,
      aggConfig.getIndexPattern(),
      deserialize(aggConfig.toSerializedFieldFormat()).convert(key)
    );
  };
};
