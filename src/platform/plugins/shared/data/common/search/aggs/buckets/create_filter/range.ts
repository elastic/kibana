/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRangeFilter } from '@kbn/es-query';
import { AggTypesDependencies } from '../../agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';

/** @internal */
export const createFilterRange = (
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart']
) => {
  return (aggConfig: IBucketAggConfig, { label, ...params }: any) => {
    const { deserialize } = getFieldFormatsStart();
    return buildRangeFilter(
      aggConfig.params.field,
      params,
      aggConfig.getIndexPattern(),
      deserialize(aggConfig.toSerializedFieldFormat()).convert(params)
    );
  };
};
