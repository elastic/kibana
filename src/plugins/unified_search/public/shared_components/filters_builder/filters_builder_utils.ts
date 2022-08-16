/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { ConditionTypes } from './filters_builder_condition_types';

// todo: {start} should be refactored cause shared component cannot be linked with non-shared components
import type { Operator } from '../filter_editor';
// todo: {end}

const PATH_SEPARATOR = '.';

/** @internal **/
export type FilterItem = Filter | FilterItem[];

/** to: @kbn/es-query **/
const buildOrFilter = (filters: FilterItem) => {
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

/** to: @kbn/es-query **/
export const isOrFilter = (filter: Filter) => Boolean(filter?.meta?.type === 'OR');

export const getConditionalOperationType = (filter: FilterItem) => {
  if (Array.isArray(filter)) {
    return ConditionTypes.AND;
  } else if (isOrFilter(filter)) {
    return ConditionTypes.OR;
  }
};

export const getPathInArray = (path: string) => path.split(PATH_SEPARATOR).map((i) => +i);

const getGroupedFilters = (filter: FilterItem) =>
  Array.isArray(filter) ? filter : filter?.meta?.params;

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
        params: normalizeArray(orFilters),
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
  const newFilters = cloneDeep(filters);
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
  const newFilters = cloneDeep(filters);
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
  const newFilters = cloneDeep(filters);
  const movingFilter = getFilterByPath(newFilters, from);

  if (getPathInArray(to).length >= getPathInArray(from).length) {
    const newFilterWithFilter = addFilter(newFilters, movingFilter, to, conditionalType);
    return removeFilter(newFilterWithFilter, from);
  } else {
    const newFiltersWithoutFilter = removeFilter(newFilters, from);
    return addFilter(newFiltersWithoutFilter, movingFilter, to, conditionalType);
  }
};

export const updateFilter = (
  filters: Filter[],
  path: string,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params']
) => {
  const newFilters = [...filters];
  const changedFilter = getFilterByPath(newFilters, path) as Filter;
  let filter = Object.assign({}, changedFilter);

  if (field && operator && params) {
    if (Array.isArray(params)) {
      filter = updateArrayParams(filter, operator, params);
    } else {
      filter = updateParams(filter, operator, params);
    }
  } else if (field && operator) {
    if (operator.type === 'exists') {
      filter = updateOperatorWithExistsType(filter, operator);
    } else {
      filter = updateOperator(filter, operator);
    }
  } else {
    filter = updateField(filter, field);
  }

  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, filter);

  return newFilters;
};

function updateField(filter: Filter, field?: DataViewField) {
  return {
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
}

function updateOperator(filter: Filter, operator?: Operator) {
  return {
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
}

function updateOperatorWithExistsType(filter: Filter, operator?: Operator) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: undefined,
      value: 'exists',
    },
    query: { exists: { ...filter!.query?.exists, [filter.meta.key!]: undefined } },
  };
}

function updateParams(filter: Filter, operator?: Operator, params?: Filter['meta']['params']) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: { ...filter.meta.params, query: params },
    },
    query: { match_phrase: { ...filter!.query?.match_phrase, [filter.meta.key!]: params } },
  };
}

function updateArrayParams(
  filter: Filter,
  operator?: Operator,
  params?: Array<Filter['meta']['params']>
) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params,
    },
    query: {
      bool: {
        minimum_should_match: 1,
        ...filter!.query?.should,
        should: params?.map((param) => {
          return { match_phrase: { [filter.meta.key!]: param } };
        }),
      },
    },
  };
}
