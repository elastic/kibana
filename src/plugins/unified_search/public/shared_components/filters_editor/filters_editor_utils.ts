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

export const addFilter = (
  filters: Filter[],
  payload: { path: string; dataViewId: string | undefined }
) => {
  const path = payload.path;
  // console.log('depth', filterDepthCalculation(path));
  // console.log('path', path);
  // console.log('group', filters);
  const resultFilters = filters;
  if (filterDepthCalculation(path) === 1) {
    resultFilters.push(buildEmptyFilter(true, payload.dataViewId));
  }
  return resultFilters;
};
