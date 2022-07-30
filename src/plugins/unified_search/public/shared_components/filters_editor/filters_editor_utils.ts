/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';
import { ConditionTypes } from './filters_editor_condition_types';

const PATH_SEPARATOR = '.';

/** @internal **/
type FilterItem = Filter | FilterItem[];

/** to: @kbn/es-query **/
const buildOrFilter = (filters: FilterItem) => {
  const filter = buildEmptyFilter(false);

  return {
    ...filter,
    meta: {
      ...filter.meta,
      params: {
        ...filter.meta.params,
        filters,
      },
    },
  };
};

/** to: @kbn/es-query **/
export const isOrFilter = (filter: Filter) => Boolean(filter.meta?.params?.filters);

export const getConditionalOperationType = (filter: FilterItem) => {
  if (Array.isArray(filter)) {
    return ConditionTypes.AND;
  } else if (isOrFilter(filter)) {
    return ConditionTypes.OR;
  }
};

export const getPathInArray = (path: string) => path.split(PATH_SEPARATOR).map((i) => +i);

const getGroupedFilters = (filter: FilterItem) =>
  Array.isArray(filter) ? filter : filter.meta.params.filters;

const doForFilterByPath = <T>(
  filters: FilterItem[],
  path: string,
  action: (filter: FilterItem) => T
) => {
  const pathArray = getPathInArray(path);
  let f = filters[pathArray[0]];
  for (let i = 1, depth = pathArray.length; i < depth; i++) {
    f = getGroupedFilters(f)[+pathArray[i]];
  }
  return action(f);
};

const getContainerMetaByPath = (filters: FilterItem[], pathInArray: number[]) => {
  let targetArray: FilterItem[] = filters;
  let parentFilter: FilterItem | undefined;
  let parentConditionType = ConditionTypes.AND;

  if (pathInArray.length > 1) {
    parentFilter = getFilterByPath(filters, getParentFilterPath(pathInArray));
    parentConditionType = getConditionalOperationType(parentFilter) ?? parentConditionType;
    targetArray = getGroupedFilters(parentFilter);
  }

  return {
    parentFilter,
    targetArray,
    parentConditionType,
  };
};

const getParentFilterPath = (pathInArray: number[]) =>
  pathInArray.slice(0, -1).join(PATH_SEPARATOR);

const normalizeFilters = (filters: FilterItem[]) => {
  const doRecursive = (f: FilterItem) => {
    if (Array.isArray(f)) {
      return normalizeArray(f);
    } else if (isOrFilter(f)) {
      return normalizeOr(f);
    }
    return f;
  };
  const normalizeArray = (filtersArray: FilterItem[]): FilterItem[] =>
    filtersArray
      .map((item) => {
        const normalized = doRecursive(item);

        if (Array.isArray(normalized)) {
          if (normalized.length === 1) {
            return normalized[0];
          }
          if (normalized.length === 0) {
            return undefined;
          }
        }
        return normalized;
      }, [])
      .filter(Boolean) as FilterItem[];
  const normalizeOr = (orFilter: Filter): FilterItem => {
    const orFilters = getGroupedFilters(orFilter);
    if (orFilters.length < 2) {
      return orFilters[0];
    }
    return {
      ...orFilter,
      meta: {
        ...orFilter.meta,
        params: {
          ...orFilter.meta.params,
          filters: normalizeArray(orFilters),
        },
      },
    };
  };

  return normalizeArray(filters) as Filter[];
};

export const getFilterByPath = (filters: FilterItem[], path: string) =>
  doForFilterByPath(filters, path, (f) => f);

export const addFilter = (
  filters: Filter[],
  filter: FilterItem,
  path: string,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];
  const pathInArray = getPathInArray(path);
  const { targetArray, parentConditionType } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];

  if (parentConditionType !== conditionalType) {
    if (conditionalType === ConditionTypes.OR) {
      targetArray.splice(selector, 1, buildOrFilter([targetArray[selector], filter]));
    }
    if (conditionalType === ConditionTypes.AND) {
      targetArray.splice(selector, 1, [targetArray[selector], filter]);
    }
  } else {
    targetArray.splice(selector + 1, 0, filter);
  }

  return newFilters;
};

export const removeFilter = (filters: Filter[], path: string) => {
  const newFilters = [...filters];
  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];

  targetArray.splice(selector, 1);

  return normalizeFilters(newFilters);
};

export const moveFilter = (
  filters: Filter[],
  from: string,
  to: string,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];
  const movingFilter = getFilterByPath(newFilters, from);

  if (getPathInArray(to).length > 1) {
    const newFilterWithFilter = addFilter(newFilters, movingFilter, to, conditionalType);
    return removeFilter(newFilterWithFilter, from);
  } else {
    const newFiltersWithoutFilter = removeFilter(newFilters, from);
    return addFilter(newFiltersWithoutFilter, movingFilter, to, conditionalType);
  }
};

export const updateFilterField = (filters: Filter[], path: string, field?: DataViewField) => {
  const newFilters = [...filters];
  const changedFilter = getFilterByPath(newFilters, path) as Filter;
  let filter = Object.assign({}, changedFilter);

  filter = {
    ...filter,
    meta: {
      ...filter.meta,
      key: field?.name,
      params: { query: undefined },
      value: undefined,
      type: undefined,
    },
    query: undefined,
  };

  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, filter);

  return newFilters;
};

export const updateFilterOperator = (filters: Filter[], path: string, operator?: Operator) => {
  const newFilters = [...filters];
  const changedFilter = getFilterByPath(newFilters, path) as Filter;
  let filter = Object.assign({}, changedFilter);

  filter = {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: { ...filter.meta.params, query: undefined },
      value: undefined,
    },
    query: { match_phrase: { ...filter!.query?.match_phrase, [filter.meta.key!]: undefined } },
  };

  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, filter);

  return newFilters;
};

export const updateFilterParams = (
  filters: Filter[],
  path: string,
  params?: Filter['meta']['params']
) => {
  const newFilters = [...filters];
  const changedFilter = getFilterByPath(newFilters, path) as Filter;
  let filter = Object.assign({}, changedFilter);

  filter = {
    ...filter,
    meta: {
      ...filter.meta,
      params: { ...filter.meta.params, query: params },
    },
    query: { match_phrase: { ...filter!.query?.match_phrase, [filter.meta.key!]: params } },
  };

  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, filter);

  return newFilters;
};
