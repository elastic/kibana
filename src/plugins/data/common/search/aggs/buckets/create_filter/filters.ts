/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { IBucketAggConfig } from '../bucket_agg_type';
import { buildQueryFilter } from '../../../../../common';

export const createFilterFilters = (aggConfig: IBucketAggConfig, key: string) => {
  // have the aggConfig write agg dsl params
  const dslFilters: any = get(aggConfig.toDsl(), 'filters.filters');
  const filter = dslFilters[key];
  const indexPattern = aggConfig.getIndexPattern();

  if (filter && indexPattern && indexPattern.id) {
    return buildQueryFilter(filter, indexPattern.id, key);
  }
};
