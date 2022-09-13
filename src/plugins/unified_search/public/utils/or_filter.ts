/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Methods from this file will be removed after they are moved to the package
import { buildEmptyFilter, Filter } from '@kbn/es-query';

export enum ConditionTypes {
  OR = 'OR',
  AND = 'AND',
}

/** @internal **/
export type FilterItem = Filter | FilterItem[];

/** to: @kbn/es-query **/
export const isOrFilter = (filter: Filter) => Boolean(filter?.meta?.type === 'OR');

/**
 * Defines a conditional operation type (AND/OR) from the filter otherwise returns undefined.
 * @param {FilterItem} filter
 */
export const getConditionalOperationType = (filter: FilterItem) => {
  if (Array.isArray(filter)) {
    return ConditionTypes.AND;
  } else if (isOrFilter(filter)) {
    return ConditionTypes.OR;
  }
};

/** to: @kbn/es-query **/
export const buildOrFilter = (filters: FilterItem) => {
  const filter = buildEmptyFilter(false);

  return {
    ...filter,
    meta: {
      ...filter.meta,
      type: 'OR',
      params: filters,
    },
  };
};
