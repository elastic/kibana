/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import type {
  Filter,
  DataViewFieldBase,
  DataViewBase,
  RangeFilterParams,
  CombinedFilter,
  BooleanRelation,
} from '@kbn/es-query';
import {
  isExistsFilter,
  isPhraseFilter,
  getPhraseFilterValue,
  getPhraseFilterField,
  getFilterField,
  isRangeFilter,
  isScriptedPhraseFilter,
  isCombinedFilter,
  buildFilter,
  buildCombinedFilter,
  FilterStateStore,
  FILTERS,
} from '@kbn/es-query';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Serializable } from '@kbn/utility-types';

import type { FilterManager } from '../filter_manager';

export interface GenerateFiltersOptions {
  /**
   * When set, a multi-value input produces a single combined filter using this relation instead
   * of one filter per value. The relation stays editable in the filter bar, which is how a user
   * turns an "all of" filter into an "any of" one. See https://github.com/elastic/kibana/issues/39433
   */
  readonly multiValueRelation?: BooleanRelation;
}

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

    if (isRangeFilter(filter)) {
      return (
        getFilterField(filter) === fieldName && _.isEqual(filter.query.range[fieldName], value)
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
 * Finds a combined filter that already holds exactly the same values, in the same order, for the
 * given field, so that re-triggering the same filter action toggles it instead of duplicating it.
 */
const getExistingCombinedFilter = (
  appFilters: Filter[],
  fieldName: string,
  values: unknown[]
): CombinedFilter | undefined => {
  const existingFilter = _.find(
    appFilters,
    (filter) =>
      isCombinedFilter(filter) &&
      filter.meta.params.length === values.length &&
      values.every((value, valueIndex) =>
        Boolean(getExistingFilter([filter.meta.params[valueIndex]], fieldName, value))
      )
  );

  return existingFilter && isCombinedFilter(existingFilter) ? existingFilter : undefined;
};

const updateExistingCombinedFilter = (existingFilter: CombinedFilter, negate: boolean) => {
  existingFilter.meta.disabled = false;
  existingFilter.meta.params = existingFilter.meta.params.map((subFilter) => ({
    ...subFilter,
    meta: { ...subFilter.meta, negate },
  }));
};

/**
 * Generate filter objects, as a result of triggering a filter action on a
 * specific index pattern field.
 *
 * @param {FilterManager} filterManager - The active filter manager to lookup for existing filters
 * @param {Field | string} field - The field for which filters should be generated
 * @param {any} values - One or more values to filter for.
 * @param {string} operation - "-" to create a negated filter
 * @param {string} index - Index string to generate filters for
 * @param {GenerateFiltersOptions} options - Optional behaviour overrides
 *
 * @returns {object} An array of filters to be added back to filterManager
 */
export function generateFilters(
  filterManager: FilterManager,
  field: DataViewFieldBase | string,
  values: any,
  operation: string,
  index: DataViewBase,
  options: GenerateFiltersOptions = {}
): Filter[] {
  values = Array.isArray(values) ? _.uniq(values) : [values];

  const fieldObj = (_.isObject(field) ? field : { name: field }) as DataViewFieldBase;
  const fieldName = fieldObj.name;
  const appFilters = filterManager.getAppFilters();
  const negate = operation === '-';

  function generateFilter(value: Serializable) {
    const isRange = fieldObj.type?.includes('range') || fieldObj.type === KBN_FIELD_TYPES.DATE;

    if (isRange && _.isObjectLike(value)) {
      return buildFilter(
        index,
        fieldObj,
        FILTERS.RANGE_FROM_VALUE,
        negate,
        false,
        value,
        null,
        FilterStateStore.APP_STATE
      );
    }

    // exists filter special case:  fieldname = '_exists' and value = fieldname
    const filterType = fieldName === '_exists_' ? FILTERS.EXISTS : FILTERS.PHRASE;
    const actualFieldObj =
      fieldName === '_exists_' ? ({ name: value } as DataViewFieldBase) : fieldObj;

    // Fix for #7189 - if value is empty, phrase filters become exists filters.
    const isNullFilter = value === null || value === undefined;

    return buildFilter(
      index,
      actualFieldObj,
      isNullFilter ? FILTERS.EXISTS : filterType,
      isNullFilter ? !negate : negate,
      false,
      value,
      null,
      FilterStateStore.APP_STATE
    );
  }

  /**
   * When filtering on a date, instead of simply creating a "match_phrase" or "match" query (which isn't useful when
   * specific date formats are involved), we create a range query that only includes this date.
   * NOTE: This assumes that the value passed in is already in an appropriate format (such as date_time or
   * strict_date_optional_time_nanos).
   * @param value
   */
  function castValue(value: unknown): unknown | RangeFilterParams {
    if (fieldObj.type === KBN_FIELD_TYPES.DATE && typeof value === 'string') {
      const format = fieldObj.esTypes?.includes('date_nanos')
        ? 'strict_date_optional_time_nanos'
        : 'date_time';
      return {
        format,
        gte: value,
        lte: value,
      };
    }

    return value;
  }

  const castedValues: unknown[] = _.map(values, (value) => castValue(value));
  const { multiValueRelation } = options;

  // A multi-value input (filtering on an array field) collapses into one combined filter rather
  // than one pill per value. Negation stays on the sub-filters so the resulting query is identical
  // to the one built from separate pills, while the relation between the values becomes explicit
  // and editable in the filter bar.
  if (multiValueRelation && castedValues.length > 1 && fieldName !== '_exists_') {
    const existingCombinedFilter = getExistingCombinedFilter(appFilters, fieldName, castedValues);

    if (existingCombinedFilter) {
      updateExistingCombinedFilter(existingCombinedFilter, negate);
      return [existingCombinedFilter];
    }

    const combinedFilter = buildCombinedFilter(
      multiValueRelation,
      castedValues.map((value) => generateFilter(value as Serializable)),
      index,
      false,
      false,
      null,
      FilterStateStore.APP_STATE
    );
    // `buildCombinedFilter` does not set a key, but the filter mappers and the filter bar rely on it
    combinedFilter.meta.key = fieldName;

    return [combinedFilter];
  }

  return castedValues.map((value) => {
    const existing = getExistingFilter(appFilters, fieldName, value);
    if (existing) {
      updateExistingFilter(existing, negate);
    }

    return existing ?? generateFilter(value as Serializable);
  });
}
