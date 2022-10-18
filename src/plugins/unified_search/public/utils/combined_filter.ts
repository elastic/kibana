/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isCombinedFilter, FilterItem } from '@kbn/es-query';

export enum ConditionTypes {
  OR = 'OR',
  AND = 'AND',
}

/**
 * Defines a conditional operation type (AND/OR) from the filter otherwise returns undefined.
 * @param {FilterItem} filter
 */
export const getConditionalOperationType = (filter: FilterItem) => {
  if (Array.isArray(filter)) {
    return ConditionTypes.AND;
  } else if (isCombinedFilter(filter)) {
    return ConditionTypes.OR;
  }
};
