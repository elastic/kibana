/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, isMatchAllFilter, FILTERS } from '@kbn/es-query';

export const mapMatchAll = (filter: Filter) => {
  if (isMatchAllFilter(filter)) {
    return {
      type: FILTERS.MATCH_ALL,
      key: filter.meta.field,
      value: filter.meta.formattedValue || 'all',
    };
  }
  throw filter;
};
