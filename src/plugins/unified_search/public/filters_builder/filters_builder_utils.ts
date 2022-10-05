/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter, FilterItem } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { buildCombinedFilter, isCombinedFilter } from '@kbn/es-query';
import { ConditionTypes, getConditionalOperationType } from '../utils';
import type { Operator } from '../filter_bar/filter_editor';

const PATH_SEPARATOR = '.';

/**
 * The method returns the filter nesting identification number as an array.
 * @param {string} path - variable is used to identify the filter and its nesting in the filter group.
 */
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

/**
 * The method corrects the positions of the filters after removing some filter from the filters.
 * @param {FilterItem[]} filters - an array of filters that may contain filters that are incorrectly nested for later display in the UI.
 */
export const normalizeFilters = (filters: FilterItem[]) => {
  const doRecursive = (f: FilterItem, parent: FilterItem) => {
    if (Array.isArray(f)) {
      return normalizeArray(f, parent);
    } else if (isCombinedFilter(f)) {
      return normalizeCombined(f);
    }
    return f;
  };

  const normalizeArray = (filtersArray: FilterItem[], parent: FilterItem): FilterItem[] => {
    const partiallyNormalized = filtersArray
      .map((item) => {
        const normalized = doRecursive(item, filtersArray);

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

    return Array.isArray(parent) ? partiallyNormalized.flat() : partiallyNormalized;
  };

  const normalizeCombined = (combinedFilter: Filter): FilterItem => {
    const combinedFilters = getGroupedFilters(combinedFilter);
    if (combinedFilters.length < 2) {
      return combinedFilters[0];
    }

    return {
      ...combinedFilter,
      meta: {
        ...combinedFilter.meta,
        params: doRecursive(combinedFilters, combinedFilter),
      },
    };
  };

  return normalizeArray(filters, filters) as Filter[];
};

/**
 * Find filter by path.
 * @param {FilterItem[]} filters - filters in which the search for the desired filter will occur.
 * @param {string} path - path to filter.
 */
export const getFilterByPath = (filters: FilterItem[], path: string) =>
  doForFilterByPath(filters, path, (f) => f);

/**
 * Method to add a filter to a specified location in a filter group.
 * @param {Filter[]} filters - array of filters where the new filter will be added.
 * @param {FilterItem} filter - new filter.
 * @param {string} path - path to filter.
 * @param {ConditionTypes} conditionalType - OR/AND relationships between filters.
 */
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
      targetArray.splice(selector, 1, buildCombinedFilter([targetArray[selector], filter]));
    }
    if (conditionalType === ConditionTypes.AND) {
      targetArray.splice(selector, 1, [targetArray[selector], filter]);
    }
  } else {
    targetArray.splice(selector + 1, 0, filter);
  }

  return newFilters;
};

/**
 * Remove filter from specified location.
 * @param {Filter[]} filters - array of filters.
 * @param {string} path - path to filter.
 */
export const removeFilter = (filters: Filter[], path: string) => {
  const newFilters = cloneDeep(filters);
  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];

  targetArray.splice(selector, 1);

  return normalizeFilters(newFilters);
};

/**
 * Moving the filter on drag and drop.
 * @param {Filter[]} filters - array of filters.
 * @param {string} from - filter path before moving.
 * @param {string} to - filter path where the filter will be moved.
 * @param {ConditionTypes} conditionalType - OR/AND relationships between filters.
 */
export const moveFilter = (
  filters: Filter[],
  from: string,
  to: string,
  conditionalType: ConditionTypes
) => {
  const addFilterThenRemoveFilter = (
    source: Filter[],
    addedFilter: FilterItem,
    pathFrom: string,
    pathTo: string,
    conditional: ConditionTypes
  ) => {
    const newFiltersWithFilter = addFilter(source, addedFilter, pathTo, conditional);
    return removeFilter(newFiltersWithFilter, pathFrom);
  };

  const removeFilterThenAddFilter = (
    source: Filter[],
    removableFilter: FilterItem,
    pathFrom: string,
    pathTo: string,
    conditional: ConditionTypes
  ) => {
    const newFiltersWithoutFilter = removeFilter(source, pathFrom);
    return addFilter(newFiltersWithoutFilter, removableFilter, pathTo, conditional);
  };

  const newFilters = cloneDeep(filters);
  const movingFilter = getFilterByPath(newFilters, from);

  const pathInArrayTo = getPathInArray(to);
  const pathInArrayFrom = getPathInArray(from);

  if (pathInArrayTo.length === pathInArrayFrom.length) {
    const filterPositionTo = pathInArrayTo.at(-1);
    const filterPositionFrom = pathInArrayFrom.at(-1);

    const { parentConditionType } = getContainerMetaByPath(newFilters, pathInArrayTo);
    const filterMovementDirection = Number(filterPositionTo) - Number(filterPositionFrom);

    if (filterMovementDirection === -1 && parentConditionType === conditionalType) {
      return filters;
    }

    if (filterMovementDirection >= -1) {
      return addFilterThenRemoveFilter(newFilters, movingFilter, from, to, conditionalType);
    } else {
      return removeFilterThenAddFilter(newFilters, movingFilter, from, to, conditionalType);
    }
  }

  if (pathInArrayTo.length > pathInArrayFrom.length) {
    return addFilterThenRemoveFilter(newFilters, movingFilter, from, to, conditionalType);
  } else {
    return removeFilterThenAddFilter(newFilters, movingFilter, from, to, conditionalType);
  }
};

/**
 * Method to update values inside filter.
 * @param {Filter[]} filters - filter array
 * @param {string} path - path to filter
 * @param {DataViewField} field - DataViewField property inside a filter
 * @param {Operator} operator - defines a relation by property and value
 * @param {Filter['meta']['params']} params - filter value
 */
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
      filter = updateWithIsOneOfOperator(filter, operator, params);
    } else {
      filter = updateWithIsOperator(filter, operator, params);
    }
  } else if (field && operator) {
    if (operator.type === 'exists') {
      filter = updateWithExistsOperator(filter, operator);
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
    query: { match_phrase: { field: filter.meta.key } },
  };
}

function updateWithExistsOperator(filter: Filter, operator?: Operator) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: undefined,
      value: 'exists',
    },
    query: { exists: { field: filter.meta.key } },
  };
}

function updateWithIsOperator(
  filter: Filter,
  operator?: Operator,
  params?: Filter['meta']['params']
) {
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

function updateWithIsOneOfOperator(
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
