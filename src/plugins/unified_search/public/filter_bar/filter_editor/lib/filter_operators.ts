/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS } from '@kbn/es-query';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { DataViewField } from '@kbn/data-views-plugin/common';

export const strings = {
  getIsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOperatorOptionLabel', {
      defaultMessage: 'is',
    }),
  getIsNotOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOperatorOptionLabel', {
      defaultMessage: 'is not',
    }),
  getIsOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOneOfOperatorOptionLabel', {
      defaultMessage: 'is one of',
    }),
  getIsNotOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
      defaultMessage: 'is not one of',
    }),
  getIsBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isBetweenOperatorOptionLabel', {
      defaultMessage: 'is between',
    }),
  getIsGreaterOrEqualOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.greaterThanOrEqualOptionLabel', {
      defaultMessage: 'greater or equal',
    }),
  getLessThanOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.lessThanOrEqualOptionLabel', {
      defaultMessage: 'less than',
    }),
  getIsNotBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
      defaultMessage: 'is not between',
    }),
  getExistsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.existsOperatorOptionLabel', {
      defaultMessage: 'exists',
    }),
  getDoesNotExistOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.doesNotExistOperatorOptionLabel', {
      defaultMessage: 'does not exist',
    }),
};

export enum OPERATORS {
  LESS = 'less',
  GREATER_OR_EQUAL = 'greater_or_equal',
  BETWEEN = 'between',
  IS = 'is',
  NOT_BETWEEN = 'not_between',
  IS_NOT = 'is_not',
  IS_ONE_OF = 'is_one_of',
  IS_NOT_ONE_OF = 'is_not_one_of',
  EXISTS = 'exists',
  DOES_NOT_EXIST = 'does_not_exist',
}

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;
  id: OPERATORS;

  /**
   * KbnFieldTypes applicable for operator
   */
  fieldTypes?: string[];

  /**
   * A filter predicate for a field,
   * takes precedence over {@link fieldTypes}
   */
  field?: (field: DataViewField) => boolean;
}

export const isOperator = {
  message: strings.getIsOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: false,
  id: OPERATORS.IS,
};

export const isNotOperator = {
  message: strings.getIsNotOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: true,
  id: OPERATORS.IS_NOT,
};

export const isOneOfOperator = {
  message: strings.getIsOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  id: OPERATORS.IS_ONE_OF,
};

export const isNotOneOfOperator = {
  message: strings.getIsNotOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  id: OPERATORS.IS_NOT_ONE_OF,
};

const rangeOperatorsSharedProps = {
  type: FILTERS.RANGE,
  field: (field: DataViewField) => {
    if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type))
      return true;

    if (field.type === 'string' && field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) return true;

    return false;
  },
};

export const isBetweenOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getIsBetweenOperatorOptionLabel(),
  id: OPERATORS.BETWEEN,
  negate: false,
};

export const isLessThanOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getLessThanOperatorOptionLabel(),
  id: OPERATORS.LESS,
  negate: false,
};

export const isGreaterOrEqualOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getIsGreaterOrEqualOperatorOptionLabel(),
  id: OPERATORS.GREATER_OR_EQUAL,
  negate: false,
};

export const isNotBetweenOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getIsNotBetweenOperatorOptionLabel(),
  negate: true,
  id: OPERATORS.NOT_BETWEEN,
};

export const existsOperator = {
  message: strings.getExistsOperatorOptionLabel(),
  type: FILTERS.EXISTS,
  negate: false,
  id: OPERATORS.EXISTS,
};

export const doesNotExistOperator = {
  message: strings.getDoesNotExistOperatorOptionLabel(),
  type: FILTERS.EXISTS,
  negate: true,
  id: OPERATORS.DOES_NOT_EXIST,
};

export const FILTER_OPERATORS: Operator[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isGreaterOrEqualOperator,
  isLessThanOperator,
  isBetweenOperator,
  isNotBetweenOperator,
  existsOperator,
  doesNotExistOperator,
];
