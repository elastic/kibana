/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRangeFilter } from '@kbn/es-query';
import type { RangeFilterParams } from '@kbn/es-query';
import type { AggTypesDependencies } from '../../agg_types';
import type { IBucketAggConfig } from '../bucket_agg_type';

/** @internal */
export const createFilterRange = (
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart']
) => {
  return (aggConfig: IBucketAggConfig, key: unknown) => {
    const { label, ...params } = key as RangeFilterParams & { label?: string };
    const { deserialize } = getFieldFormatsStart();
    return buildRangeFilter(
      aggConfig.getField()!,
      params as RangeFilterParams,
      aggConfig.getIndexPattern(),
      deserialize(aggConfig.toSerializedFieldFormat()).convert(params)
    );
  };
};
