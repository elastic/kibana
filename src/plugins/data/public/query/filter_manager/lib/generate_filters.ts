/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import {
  Filter,
  isExistsFilter,
  isPhraseFilter,
  getPhraseFilterValue,
  getPhraseFilterField,
  isScriptedPhraseFilter,
  buildFilter,
  FilterStateStore,
  FILTERS,
} from '@kbn/es-query';

import { IFieldType, IIndexPattern } from '../../../../common';
import { FilterManager } from '../filter_manager';

function getExistingFilter(
  appFilters: Filter[],
  fieldName: string,
  value: any
): Filter | undefined {
  // TODO: On array fields, negating does not negate the combination, rather all terms
  return _.find(appFilters, function (filter) {
    if (!filter) return;

    if (fieldName === '_exists_' && isExistsFilter(filter)) {
      return filter.query.exists!.field === value;
    }

    if (isPhraseFilter(filter)) {
      return getPhraseFilterField(filter) === fieldName && getPhraseFilterValue(filter) === value;
    }

    if (isScriptedPhraseFilter(filter)) {
      return (
        filter.meta.field === fieldName && filter.query?.script?.script?.params?.value === value
      );
    }
  }) as any;
}

function updateExistingFilter(existingFilter: Filter, negate: boolean) {
  existingFilter.meta.disabled = false;
  if (existingFilter.meta.negate !== negate) {
    existingFilter.meta.negate = !existingFilter.meta.negate;
  }
}

/**
 * Generate filter objects, as a result of triggering a filter action on a
 * specific index pattern field.
 *
 * @param {FilterManager} filterManager - The active filter manager to lookup for existing filters
 * @param {Field | string} field - The field for which filters should be generated
 * @param {any} values - One or more values to filter for.
 * @param {string} operation - "-" to create a negated filter
 * @param {string} index - Index string to generate filters for
 *
 * @returns {object} An array of filters to be added back to filterManager
 */
export function generateFilters(
  filterManager: FilterManager,
  field: IFieldType | string,
  values: any,
  operation: string,
  index: string
): Filter[] {
  values = Array.isArray(values) ? _.uniq(values) : [values];
  const fieldObj = (
    _.isObject(field)
      ? field
      : {
          name: field,
        }
  ) as IFieldType;
  const fieldName = fieldObj.name;
  const newFilters: Filter[] = [];
  const appFilters = filterManager.getAppFilters();

  const negate = operation === '-';
  let filter;

  _.each(values, function (value) {
    const existing = getExistingFilter(appFilters, fieldName, value);

    if (existing) {
      updateExistingFilter(existing, negate);
      filter = existing;
    } else if (fieldObj.type?.includes('range') && value && typeof value === 'object') {
      // When dealing with range fields, the filter type depends on the data passed in. If it's an
      // object we assume that it's a min/max value
      const tmpIndexPattern = { id: index } as IIndexPattern;

      filter = buildFilter(
        tmpIndexPattern,
        fieldObj,
        FILTERS.RANGE_FROM_VALUE,
        false,
        false,
        value,
        null,
        FilterStateStore.APP_STATE
      );
    } else {
      const tmpIndexPattern = { id: index } as IIndexPattern;
      // exists filter special case:  fieldname = '_exists' and value = fieldname
      const filterType = fieldName === '_exists_' ? FILTERS.EXISTS : FILTERS.PHRASE;
      const actualFieldObj = fieldName === '_exists_' ? ({ name: value } as IFieldType) : fieldObj;

      // Fix for #7189 - if value is empty, phrase filters become exists filters.
      const isNullFilter = value === null || value === undefined;

      filter = buildFilter(
        tmpIndexPattern,
        actualFieldObj,
        isNullFilter ? FILTERS.EXISTS : filterType,
        isNullFilter ? !negate : negate,
        false,
        value,
        null,
        FilterStateStore.APP_STATE
      );
    }

    newFilters.push(filter);
  });

  return newFilters;
}
