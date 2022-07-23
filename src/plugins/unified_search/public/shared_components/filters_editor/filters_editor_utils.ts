/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { ConditionTypes } from './filters_editor_condition_types';

export const getConditionalOperationType = (filter: Filter): ConditionTypes | undefined => {
  const { conditionalType } = filter.meta?.params || {};

  if (conditionalType) {
    switch (conditionalType) {
      case 'or':
        return ConditionTypes.OR;
      case 'and':
        return ConditionTypes.AND;
    }
  }
};

export const filterDepthCalculation = (path: string): number => {
  return path.replace(/([0-9])/g, '').split('.').length;
};

export const insertFilterInFilterGroup = (arr: Filter[], index: number, newItem: Filter) => [
  ...arr.slice(0, index),
  newItem,
  ...arr.slice(index),
];

export const removeFilterFromFilterGroup = (arr: Filter[], index: number, newItem: Filter) => [
  ...arr.slice(0, index),
  newItem,
  ...arr.slice(index),
];

export const addFilter = (
  filters: Filter[],
  payload: { path: string; dataViewId: string | undefined }
) => {
  const newFilter = buildEmptyFilter(true, payload.dataViewId);
  const orderInFilterGroup = Number(payload.path.split('.').at(-1));

  const numberOfFilterGroup = filterDepthCalculation(payload.path);
  console.log('depth', filterDepthCalculation(payload.path));
  console.log('payload.path', payload.path);

  let resultFilters = filters;

  resultFilters = insertFilterInFilterGroup(filters, orderInFilterGroup + 1, newFilter);

  return resultFilters;
};
