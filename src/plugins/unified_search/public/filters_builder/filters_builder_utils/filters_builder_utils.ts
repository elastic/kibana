/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { BooleanRelation } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { buildCombinedFilter, isCombinedFilter } from '@kbn/es-query';
import { getBooleanRelationType } from '../../utils';
import { updateFilter } from './update_filter';
import type { Operator } from '../../filter_bar/filter_editor';

const PATH_SEPARATOR = '.';

/**
 * The method returns the filter nesting identification number as an array.
 * @param {string} path - variable is used to identify the filter and its nesting in the filter group.
 */
export const getPathInArray = (path: string) => path.split(PATH_SEPARATOR).map((i) => +i);

const getGroupedFilters = (filter: Filter) =>
  Array.isArray(filter) ? filter : filter?.meta?.params;

const doForFilterByPath = <T>(filters: Filter[], path: string, action: (filter: Filter) => T) => {
  const pathArray = getPathInArray(path);
  let f = filters[pathArray[0]];
  for (let i = 1, depth = pathArray.length; i < depth; i++) {
    f = getGroupedFilters(f)[+pathArray[i]];
  }
  return action(f);
};

const getContainerMetaByPath = (filters: Filter[], pathInArray: number[]) => {
  let targetArray: Filter[] = filters;
  let parentFilter: Filter | undefined;
  let parentConditionType = BooleanRelation.AND;

  if (pathInArray.length > 1) {
    parentFilter = getFilterByPath(filters, getParentFilterPath(pathInArray));
    parentConditionType = getBooleanRelationType(parentFilter) ?? parentConditionType;
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
 * @param {Filter[]} filters - an array of filters that may contain filters that are incorrectly nested for later display in the UI.
 */
export const normalizeFilters = (filters: Filter[]) => {
  const doRecursive = (f: Filter, parent: Filter[] | Filter) => {
    if (Array.isArray(f)) {
      return normalizeArray(f, parent);
    } else if (isCombinedFilter(f)) {
      return normalizeCombined(f);
    }
    return f;
  };

  const normalizeArray = (filtersArray: Filter[], parent: Filter[] | Filter): Filter[] => {
    const partiallyNormalized = filtersArray
      .map((item: Filter) => {
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
      .filter(Boolean) as Filter[];

    return Array.isArray(parent) ? partiallyNormalized.flat() : partiallyNormalized;
  };

  const normalizeCombined = (combinedFilter: Filter): Filter => {
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
 * @param {Filter[]} filters - filters in which the search for the desired filter will occur.
 * @param {string} path - path to filter.
 */
export const getFilterByPath = (filters: Filter[], path: string) =>
  doForFilterByPath(filters, path, (f) => f);

/**
 * Method to add a filter to a specified location in a filter group.
 * @param {Filter[]} filters - array of filters where the new filter will be added.
 * @param {Filter} filter - new filter.
 * @param {string} path - path to filter.
 * @param {BooleanRelation} booleanRelation - OR/AND relationships between filters.
 */
export const addFilter = (
  filters: Filter[],
  filter: Filter,
  path: string,
  booleanRelation: BooleanRelation,
  dataView: DataView
) => {
  const newFilters = cloneDeep(filters);
  const pathInArray = getPathInArray(path);
  const { targetArray, parentConditionType } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];

  if (parentConditionType !== booleanRelation) {
    if (booleanRelation === BooleanRelation.OR) {
      targetArray.splice(
        selector,
        1,
        buildCombinedFilter(BooleanRelation.OR, [targetArray[selector], filter], dataView)
      );
    }
    if (booleanRelation === BooleanRelation.AND) {
      targetArray.splice(
        selector,
        1,
        buildCombinedFilter(BooleanRelation.AND, [targetArray[selector], filter], dataView)
      );
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
 * @param {BooleanRelation} booleanRelation - OR/AND relationships between filters.
 */
export const moveFilter = (
  filters: Filter[],
  from: string,
  to: string,
  booleanRelation: BooleanRelation,
  dataView: DataView
) => {
  const addFilterThenRemoveFilter = (
    source: Filter[],
    addedFilter: Filter,
    pathFrom: string,
    pathTo: string,
    conditional: BooleanRelation
  ) => {
    const newFiltersWithFilter = addFilter(source, addedFilter, pathTo, conditional, dataView);
    return removeFilter(newFiltersWithFilter, pathFrom);
  };

  const removeFilterThenAddFilter = (
    source: Filter[],
    removableFilter: Filter,
    pathFrom: string,
    pathTo: string,
    conditional: BooleanRelation
  ) => {
    const newFiltersWithoutFilter = removeFilter(source, pathFrom);
    return addFilter(newFiltersWithoutFilter, removableFilter, pathTo, conditional, dataView);
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

    if (filterMovementDirection === -1 && parentConditionType === booleanRelation) {
      return filters;
    }

    if (filterMovementDirection >= -1) {
      return addFilterThenRemoveFilter(newFilters, movingFilter, from, to, booleanRelation);
    } else {
      return removeFilterThenAddFilter(newFilters, movingFilter, from, to, booleanRelation);
    }
  }

  if (pathInArrayTo.length > pathInArrayFrom.length) {
    return addFilterThenRemoveFilter(newFilters, movingFilter, from, to, booleanRelation);
  } else {
    return removeFilterThenAddFilter(newFilters, movingFilter, from, to, booleanRelation);
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
export const updateFilters = (
  filters: Filter[],
  path: string,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params']
) => {
  const newFilters = [...filters];
  const updatedFilter = updateFilter(getFilterByPath(newFilters, path), field, operator, params);

  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, updatedFilter);

  return newFilters;
};
