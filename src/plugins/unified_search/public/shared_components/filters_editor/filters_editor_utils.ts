/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { ConditionTypes } from './filters_editor_condition_types';

const PATH_SEPARATOR = '.';

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

const doForFilterByPath = (filters: Filter[], path: string, action: (filter: Filter) => void) => {
  const pathArray = path.split(PATH_SEPARATOR);
  let f: Filter = filters[+pathArray[0]];
  for (let i = 1, depth = pathArray.length; i < depth; i++) {
    f = f?.meta?.params?.filters?.[+pathArray[i]] ?? f;
  }
  return action(f);
};

const getParentFilterPath = (path: string) => {
  return path.split(PATH_SEPARATOR).slice(0, -1).join(PATH_SEPARATOR);
};

export const getFilterDepth = (path: string) => {
  return path.split(PATH_SEPARATOR).length || 1;
};

export const getFilterByPath = (filters: Filter[], path: string) => {
  return doForFilterByPath(filters, path, (f) => f);
};

export const addFilter = (
  filters: Filter[],
  path: string,
  dataViewId: string | undefined,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];

  console.log(getFilterByPath(newFilters, getParentFilterPath(path)));

  return newFilters;
};

export const removeFilter = (filters: Filter[], payload: { path: string }) => {
  return [...filters];
};

export const updateFilter = (
  filters: Filter[],
  path: string,
  params: {
    // todo: add more parameters
    dataViewId: string | undefined;
  }
) => {
  return [...filters];
};
