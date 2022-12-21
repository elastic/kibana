/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { Filter, updateFilter } from '@kbn/es-query';
import { BooleanRelation } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { buildCombinedFilter, isCombinedFilter } from '@kbn/es-query';
import { getBooleanRelationType } from '../../utils';
import type { Operator } from '../../filter_bar/filter_editor';
import { FilterLocation, Path } from '../types';

const PATH_SEPARATOR = '.';

export const getPathInArray = (path: Path) => path.split(PATH_SEPARATOR).map(Number);

const getGroupedFilters = (filter: Filter): Filter[] =>
  Array.isArray(filter) ? filter : filter?.meta?.params ?? [];

const doForFilterByPath = <T>(filters: Filter[], path: Path, action: (filter: Filter) => T) => {
  const [first, ...restPath] = getPathInArray(path);

  const foundFilter = restPath.reduce((filter, filterLocation) => {
    return getGroupedFilters(filter)[Number(filterLocation)];
  }, filters[first]);

  return action(foundFilter);
};

const getContainerMetaByPath = (filters: Filter[], pathInArray: number[]) => {
  if (pathInArray.length <= 1) {
    return {
      parentFilter: undefined,
      targetArray: filters,
      parentConditionType: BooleanRelation.AND,
    };
  }

  const parentFilter = getFilterByPath(filters, getParentFilterPath(pathInArray));
  const targetArray = getGroupedFilters(parentFilter);

  return {
    parentFilter,
    targetArray: Array.isArray(targetArray) ? targetArray : targetArray ? [targetArray] : [],
    parentConditionType: getBooleanRelationType(parentFilter) ?? BooleanRelation.AND,
  };
};

const getParentFilterPath = (pathInArray: number[]) =>
  pathInArray.slice(0, -1).join(PATH_SEPARATOR);

export const normalizeFilters = (filters: Filter[]) => {
  const normalizeRecursively = (
    f: Filter | Filter[],
    parent: Filter[] | Filter
  ): Filter | Filter[] | undefined => {
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
        const normalized = normalizeRecursively(item, filtersArray);

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

  const normalizeCombined = (combinedFilter: Filter) => {
    const combinedFilters = getGroupedFilters(combinedFilter);
    const nonEmptyCombinedFilters = combinedFilters.filter(Boolean);
    if (nonEmptyCombinedFilters.length < 2) {
      return nonEmptyCombinedFilters[0];
    }

    return combinedFilter
      ? {
          ...combinedFilter,
          meta: {
            ...combinedFilter.meta,
            params: normalizeRecursively(nonEmptyCombinedFilters, combinedFilter),
          },
        }
      : undefined;
  };

  return normalizeArray(filters, filters) as Filter[];
};

export const getFilterByPath = (filters: Filter[], path: Path) =>
  doForFilterByPath(filters, path, (f) => f);

export const addFilter = (
  filters: Filter[],
  filter: Filter,
  dest: FilterLocation,
  booleanRelation: BooleanRelation,
  dataView: DataView
) => {
  const newFilters = cloneDeep(filters);
  const pathInArray = getPathInArray(dest.path);
  const { targetArray, parentConditionType } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray.at(-1) ?? 0;

  if (booleanRelation && parentConditionType !== booleanRelation) {
    targetArray.splice(
      selector,
      1,
      buildCombinedFilter(booleanRelation, [targetArray[selector], filter], dataView)
    );
  } else {
    targetArray.splice(dest.index, 0, filter);
  }
  return newFilters;
};

const removeFilterWithoutNormalization = (filters: Filter[], dest: FilterLocation) => {
  const newFilters = cloneDeep(filters);
  const pathInArray = getPathInArray(dest.path);
  const meta = getContainerMetaByPath(newFilters, pathInArray);
  const target: Array<Filter | undefined> = meta.targetArray;
  target[dest.index] = undefined;

  return newFilters;
};

export const removeFilter = (filters: Filter[], dest: FilterLocation) => {
  const newFilters = removeFilterWithoutNormalization(filters, dest);
  return normalizeFilters(newFilters);
};

export const moveFilter = (
  filters: Filter[],
  from: FilterLocation,
  to: FilterLocation,
  booleanRelation: BooleanRelation,
  dataView: DataView
) => {
  const newFilters = cloneDeep(filters);
  const movingFilter = getFilterByPath(newFilters, from.path);
  const filtersWithoutRemoved = removeFilterWithoutNormalization(newFilters, from);

  const updatedFilters = addFilter(
    filtersWithoutRemoved,
    movingFilter,
    to,
    booleanRelation,
    dataView
  );

  return normalizeFilters(updatedFilters);
};

export const updateFilters = (
  filters: Filter[],
  dest: FilterLocation,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params']
) => {
  const newFilters = [...filters];
  const updatedFilter = updateFilter(
    getFilterByPath(newFilters, dest.path),
    field?.name,
    operator,
    params
  );
  const pathInArray = getPathInArray(dest.path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];
  targetArray.splice(selector, 1, updatedFilter);

  return newFilters;
};
