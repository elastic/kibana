/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, FILTERS } from '@kbn/es-query';

// Use mapSpatialFilter mapper to avoid bloated meta with value and params for spatial filters.
export const mapSpatialFilter = (filter: Filter) => {
  if (filter.meta?.type === FILTERS.SPATIAL_FILTER) {
    return {
      type: filter.meta.type,
      // spatial filters support multiple fields across multiple data views
      // do not provide "key" since filter does not provide a single field
      key: undefined,
      // default mapper puts stringified filter in "value"
      // do not provide "value" to avoid bloating URL
      value: undefined,
    };
  }

  throw filter;
};
