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

export const removeFilterFromFilterGroup = (arr: Filter[], index: number) => [
  ...arr.slice(0, index),
  ...arr.slice(index + 1),
];

const goIntoFilersGroup = (
  root: Filter[],
  index: number,
  path: string,
  newFilter: Filter
): Filter[] => {
  const orderInFilterGroup = path.split('.').length > 0 ? Number(path.split('.')[0]) : 0;

  if (filterDepthCalculation(path) === 1) {
    return insertFilterInFilterGroup(root, index + 1, newFilter);
  } else {
    return goIntoFilersGroup(
      root[orderInFilterGroup].meta.params.filters,
      orderInFilterGroup + 1,
      path.split('.').slice(1).join('.'),
      newFilter
    );
  }
};

export const addFilter = (
  filters: Filter[],
  payload: { path: string; dataViewId: string | undefined }
) => {
  const newFilter = buildEmptyFilter(true, payload.dataViewId);
  // const orderInFilterGroup = Number(payload.path.split('.').at(-1));
  const orderInFilterGroup =
    payload.path.split('.').length > 0 ? Number(payload.path.split('.')[0]) : 0;
  const filterDepth = filterDepthCalculation(payload.path);

  console.log('payload.path', payload.path);
  console.log('filterDepth', filterDepth);
  console.log('orderInFilterGroup', orderInFilterGroup);

  return goIntoFilersGroup(filters, orderInFilterGroup, payload.path, newFilter);
};

export const removeFilter = (filters: Filter[], payload: { path: string }) => {
  const orderInFilterGroup = Number(payload.path.split('.').at(-1));

  return removeFilterFromFilterGroup(filters, orderInFilterGroup);
};
