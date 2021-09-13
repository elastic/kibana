/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildFilter as esQueryBuildFilter, FILTERS, getFilterParams } from '@kbn/es-query';
import { ReactElement } from 'react';
import { PhraseValueInput } from './phrase_value_input';
import { PhrasesValuesInput } from './phrases_values_input';
import { RangeValueInput } from './range_value_input';
import { EXISTS_LABEL, PHRASES_LABEL } from './lib/filter_label';
import { isExistsFilterValid, isPhraseFilterValid, isPhrasesFilterValid, isRangeFilterValid } from './lib/filter_editor_utils';

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;
  fieldTypes?: string[];
  editor: ReactElement | null;
  buildFilter: (
    indexPattern?: IndexPatternBase,
    field?: IndexPatternFieldBase,
    disabled: boolean,
    params?: Serializable,
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

const registry: Operator[] = [
  {
    message: i18n.translate('data.filter.filterEditor.isOperatorOptionLabel', {
      defaultMessage: 'is',
    }),
    type: FILTERS.PHRASE,
    negate: false,
    editor: PhraseValueInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.PHRASE,
          false,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isPhraseFilterValid,
  },
  {
    message: i18n.translate('data.filter.filterEditor.isNotOperatorOptionLabel', {
      defaultMessage: 'is not',
    }),
    type: FILTERS.PHRASE,
    negate: true,
    editor: PhraseValueInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.PHRASE,
          true,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isPhraseFilterValid,
  },
  {
    message: PHRASES_LABEL,
    type: FILTERS.PHRASES,
    negate: false,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
    editor: PhrasesValuesInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.PHRASES,
          false,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isPhrasesFilterValid,
  },
  {
    message: i18n.translate('data.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
      defaultMessage: 'is not one of',
    }),
    type: FILTERS.PHRASES,
    negate: true,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
    editor: PhrasesValuesInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.PHRASES,
          true,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isPhrasesFilterValid,
  },
  {
    message: i18n.translate('data.filter.filterEditor.isBetweenOperatorOptionLabel', {
      defaultMessage: 'is between',
    }),
    type: FILTERS.RANGE,
    negate: false,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
    editor: RangeValueInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.RANGE,
          false,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isRangeFilterValid,
  },
  {
    message: i18n.translate('data.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
      defaultMessage: 'is not between',
    }),
    type: FILTERS.RANGE,
    negate: true,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
    editor: RangeValueInput,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.RANGE,
          true,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isRangeFilterValid,
  },
  {
    message: EXISTS_LABEL,
    type: FILTERS.EXISTS,
    negate: false,
    editor: null,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.EXISTS,
          false,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isExistsFilterValid,
  },
  {
    message: i18n.translate('data.filter.filterEditor.doesNotExistOperatorOptionLabel', {
      defaultMessage: 'does not exist',
    }),
    type: FILTERS.EXISTS,
    negate: true,
    editor: null,
    buildFilter: (
      indexPattern,
      field,
      disabled,
      params,
      alias,
      store,
    ) => {
      return indexPattern && field
        ? esQueryBuildFilter(
          indexPattern,
          field,
          FILTERS.EXISTS,
          true,
          disabled,
          params,
          alias,
          store
        )
        : undefined;
    },
    getFilterParams,
    isFilterValid: isExistsFilterValid,
  }
];

interface FilterOperatorRegistry {
  get: () => Operator[];
  add: (newOperator: Operator) => void;
}

export const filterOperatorRegistry: FilterOperatorRegistry = {
  get: () => [...registry],
  add: (newOperator: Operator) => {
    if (registry.find((operator) => operator.type === newOperator.type && operator.negate === newOperator.negate)) {
      throw new Error(`Filter operator already registered for type: ${newOperator.type}, negate: ${newOperator.negate}`);
    }
    registry.push(newOperator);
  },
};