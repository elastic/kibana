/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import {
  IFieldType,
  IIndexPattern,
  Filter,
  isExistsFilter,
  isPhraseFilter,
  getPhraseFilterValue,
  getPhraseFilterField,
  isScriptedPhraseFilter,
  buildFilter,
  FilterStateStore,
  FILTERS,
} from '../../../../common';
import { FilterManager } from '../filter_manager';

function getExistingFilter(
  appFilters: Filter[],
  fieldName: string,
  value: any
): Filter | undefined {
  // TODO: On array fields, negating does not negate the combination, rather all terms
  return _.find(appFilters, function(filter) {
    if (!filter) return;

    if (fieldName === '_exists_' && isExistsFilter(filter)) {
      return filter.exists!.field === value;
    }

    if (isPhraseFilter(filter)) {
      return getPhraseFilterField(filter) === fieldName && getPhraseFilterValue(filter) === value;
    }

    if (isScriptedPhraseFilter(filter)) {
      return filter.meta.field === fieldName && filter.script!.script.params.value === value;
    }
  });
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
  values = Array.isArray(values) ? values : [values];
  const fieldObj = (_.isObject(field)
    ? field
    : {
        name: field,
      }) as IFieldType;
  const fieldName = fieldObj.name;
  const newFilters: Filter[] = [];
  const appFilters = filterManager.getAppFilters();

  const negate = operation === '-';
  let filter;

  _.each(values, function(value) {
    const existing = getExistingFilter(appFilters, fieldName, value);

    if (existing) {
      updateExistingFilter(existing, negate);
      filter = existing;
    } else {
      const tmpIndexPattern = { id: index } as IIndexPattern;

      const filterType = fieldName === '_exists_' ? FILTERS.EXISTS : FILTERS.PHRASE;
      filter = buildFilter(
        tmpIndexPattern,
        fieldObj,
        filterType,
        negate,
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
