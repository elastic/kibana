/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS, getFilterParams } from '@kbn/es-query';
import { ReactElement } from 'react';
import { PhraseValueInput } from '../phrase_value_input';
import { PhrasesValuesInput } from '../phrases_values_input';
import { RangeValueInput } from '../range_value_input';
import { buildEsQueryFilter, isExistsFilterValid, isPhraseFilterValid, isPhrasesFilterValid, isRangeFilterValid } from './filter_editor_utils';

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;
  fieldTypes?: string[];
  editor: ReactElement | null;
  buildFilter: (
    indexPattern: IndexPatternBase,
    field: IndexPatternFieldBase,
    type: FILTERS,
    negate: boolean,
    disabled: boolean,
    params: Serializable,
    alias: string | null,
    store?: FilterStateStore
  ) => Filter | undefined;
  getFilterParams: (filter: Filter) => any;
  isFilterValid: (
    indexPattern?: IIndexPattern,
    field?: IFieldType,
    params?: any,
  ) => boolean;
}

export const spatialFilterOperator = {
  message: i18n.translate('data.filter.filterEditor.spatialFilterLabel', {
    defaultMessage: 'spatial filter',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
  fieldTypes: ['geo_point', 'geo_shape'],
  editor: null,
  buildFilter: (
    indexPattern: IndexPatternBase,
    field: IndexPatternFieldBase,
    type: FILTERS,
    negate: boolean,
    disabled: boolean,
    params: Serializable,
    alias: string | null,
    store?: FilterStateStore
  ) => {
    const filter: Filter = {
      meta: {
        alias,
        negate,
        disabled,
        isMultiIndex: true,
        type,
      },
      query: params.query
    };
    if (store) {
      filter.$state = { store };
    }
    return filter;
  },
  getFilterParams: (filter: Filter) => {
    return { query: filter.query };
  },
  isFilterValid: () => { return true; },
};

export const isOperator = {
  message: i18n.translate('data.filter.filterEditor.isOperatorOptionLabel', {
    defaultMessage: 'is',
  }),
  type: FILTERS.PHRASE,
  negate: false,
  editor: PhraseValueInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isPhraseFilterValid,
};

export const isNotOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOperatorOptionLabel', {
    defaultMessage: 'is not',
  }),
  type: FILTERS.PHRASE,
  negate: true,
  editor: PhraseValueInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isPhraseFilterValid,
};

export const isOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isOneOfOperatorOptionLabel', {
    defaultMessage: 'is one of',
  }),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  editor: PhrasesValuesInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isPhrasesFilterValid,
};

export const isNotOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
    defaultMessage: 'is not one of',
  }),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  editor: PhrasesValuesInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isPhrasesFilterValid,
};

export const isBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isBetweenOperatorOptionLabel', {
    defaultMessage: 'is between',
  }),
  type: FILTERS.RANGE,
  negate: false,
  fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  editor: RangeValueInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isRangeFilterValid,
};

export const isNotBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
    defaultMessage: 'is not between',
  }),
  type: FILTERS.RANGE,
  negate: true,
  fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  editor: RangeValueInput,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isRangeFilterValid,
};

export const existsOperator = {
  message: i18n.translate('data.filter.filterEditor.existsOperatorOptionLabel', {
    defaultMessage: 'exists',
  }),
  type: FILTERS.EXISTS,
  negate: false,
  editor: null,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isExistsFilterValid,
};

export const doesNotExistOperator = {
  message: i18n.translate('data.filter.filterEditor.doesNotExistOperatorOptionLabel', {
    defaultMessage: 'does not exist',
  }),
  type: FILTERS.EXISTS,
  negate: true,
  editor: null,
  buildFilter: buildEsQueryFilter,
  getFilterParams,
  isFilterValid: isExistsFilterValid,
};

export const FILTER_OPERATORS: Operator[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isBetweenOperator,
  isNotBetweenOperator,
  existsOperator,
  doesNotExistOperator,
  spatialFilterOperator,
];
