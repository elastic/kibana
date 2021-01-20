/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FILTERS } from '../../../../../common';

// Use mapSpatialFilter mapper to avoid bloated meta with value and params for spatial filters.
export const mapSpatialFilter = (filter: Filter) => {
  if (
    filter.meta &&
    filter.meta.key &&
    filter.meta.alias &&
    filter.meta.type === FILTERS.SPATIAL_FILTER
  ) {
    return {
      key: filter.meta.key,
      type: filter.meta.type,
      value: '',
    };
  }
  throw filter;
};
