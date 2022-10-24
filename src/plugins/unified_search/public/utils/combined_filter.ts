/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Filter, isCombinedFilter, CombinedFilter } from '@kbn/es-query';

/**
 * Defines a conditional operation type (AND/OR) from the filter otherwise returns undefined.
 * @param {Filter} filter
 */
export const getConditionalOperationType = (filter: Filter | CombinedFilter) => {
  if (isCombinedFilter(filter)) {
    return filter.meta.relation;
  }
};
