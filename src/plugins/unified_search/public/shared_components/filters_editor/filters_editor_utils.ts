/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';
import { ConditionTypes } from './filters_editor_condition_types';

const PATH_SEPARATOR = '.';

/** to: @kbn/es-query **/
const buildConditionalFilter = (conditionalType: 'or' | 'and', filters: Filter[]) => {
  const filter = buildEmptyFilter(false);

  return {
    ...filter,
    meta: {
      ...filter.meta,
      params: {
        ...filter.meta.params,
        conditionalType,
        filters,
      },
    },
  };
};

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

const doForFilterByPath = <T>(filters: Filter[], path: string, action: (filter: Filter) => T) => {
  const pathArray = path.split(PATH_SEPARATOR);
  let f: Filter = filters[+pathArray[0]];
  for (let i = 1, depth = pathArray.length; i < depth; i++) {
    f = f?.meta?.params?.filters?.[+pathArray[i]] ?? f;
  }
  return action(f);
};

const getContainerMetaByPath = (filters: Filter[], path: string) => {
  const pathInArray = path.split(PATH_SEPARATOR);
  let targetArray: Filter[] = filters;
  let parentFilter: Filter | undefined;
  let parentConditionType = ConditionTypes.AND;

  if (pathInArray.length > 1) {
    parentFilter = getFilterByPath(filters, getParentFilterPath(path));
    parentConditionType = getConditionalOperationType(parentFilter) ?? parentConditionType;
    targetArray = parentFilter.meta.params.filters;
  }

  return {
    parentFilter,
    targetArray,
    parentConditionType,
  };
};

const getParentFilterPath = (path: string) => {
  return path.split(PATH_SEPARATOR).slice(0, -1).join(PATH_SEPARATOR);
};

export const getFilterByPath = (filters: Filter[], path: string): Filter => {
  return doForFilterByPath(filters, path, (f) => f);
};

const normalizeFilters = (filters: Filter[]): Filter[] => {
  return filters
    .map((filter: Filter) => {
      if (getConditionalOperationType(filter)) {
        const f = normalizeFilters(filter.meta.params.filters);
        if (f) {
          if (f.length === 1) {
            return f[0];
          }
          if (f.length === 0) {
            return undefined;
          }
        }
        return {
          ...filter,
          meta: {
            ...filter.meta,
            params: {
              ...filter.meta.params,
              filters: f,
            },
          },
        };
      }
      return filter;
    })
    .filter(Boolean) as Filter[];
};

export const addFilter = (
  filters: Filter[],
  path: string,
  dataViewId: string | undefined,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];
  const pathInArray = path.split(PATH_SEPARATOR);
  const { targetArray, parentConditionType } = getContainerMetaByPath(newFilters, path);

  const newFilter = buildEmptyFilter(false, dataViewId);
  const selector = +pathInArray[pathInArray.length - 1];

  if (parentConditionType !== conditionalType) {
    targetArray.splice(
      selector,
      1,
      buildConditionalFilter(conditionalType === ConditionTypes.AND ? 'and' : 'or', [
        targetArray[selector],
        newFilter,
      ])
    );
  } else {
    targetArray.splice(selector, 0, newFilter);
  }

  return newFilters;
};

export const removeFilter = (filters: Filter[], path: string) => {
  const newFilters = [...filters];
  const pathInArray = path.split(PATH_SEPARATOR);
  const { targetArray } = getContainerMetaByPath(newFilters, path);
  const selector = +pathInArray[pathInArray.length - 1];

  targetArray.splice(selector, 1);

  return normalizeFilters(newFilters);
};

export const updateFilter = (
  filters: Filter[],
  path: string,
  dataView: DataView,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params'],
  filter?: Filter
) => {
  return [...filters];
};
