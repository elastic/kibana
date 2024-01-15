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
  getEqualsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.equalsOperatorOptionLabel', {
      defaultMessage: 'equals',
    }),
  getDoesNotEqualOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.doesNotEqualOperatorOptionLabel', {
      defaultMessage: 'does not equal',
    }),
  getOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.oneOfOperatorOptionLabel', {
      defaultMessage: 'one of',
    }),
  getNotOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.notOneOfOperatorOptionLabel', {
      defaultMessage: 'not one of',
    }),
  getBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.betweenOperatorOptionLabel', {
      defaultMessage: 'between',
    }),
  getGreaterOrEqualOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.greaterThanOrEqualOptionLabel', {
      defaultMessage: 'greater or equal',
    }),
  getLessThanOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.lessThanOrEqualOptionLabel', {
      defaultMessage: 'less than',
    }),
  getNotBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.notBetweenOperatorOptionLabel', {
      defaultMessage: 'not between',
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
  EQUALS = 'equals',
  NOT_BETWEEN = 'not_between',
  DOES_NOT_EQUAL = 'does_not_equal',
  ONE_OF = 'one_of',
  NOT_ONE_OF = 'not_one_of',
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

export const equalsOperator = {
  message: strings.getEqualsOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: false,
  id: OPERATORS.EQUALS,
};

export const doesNotEqualOperator = {
  message: strings.getDoesNotEqualOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: true,
  id: OPERATORS.DOES_NOT_EQUAL,
};

export const oneOfOperator = {
  message: strings.getOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  id: OPERATORS.ONE_OF,
};

export const notOneOfOperator = {
  message: strings.getNotOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  id: OPERATORS.NOT_ONE_OF,
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

export const betweenOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getBetweenOperatorOptionLabel(),
  id: OPERATORS.BETWEEN,
  negate: false,
};

export const lessThanOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getLessThanOperatorOptionLabel(),
  id: OPERATORS.LESS,
  negate: false,
};

export const greaterOrEqualOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getGreaterOrEqualOperatorOptionLabel(),
  id: OPERATORS.GREATER_OR_EQUAL,
  negate: false,
};

export const notBetweenOperator = {
  ...rangeOperatorsSharedProps,
  message: strings.getNotBetweenOperatorOptionLabel(),
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
  equalsOperator,
  doesNotEqualOperator,
  oneOfOperator,
  notOneOfOperator,
  greaterOrEqualOperator,
  lessThanOperator,
  betweenOperator,
  notBetweenOperator,
  existsOperator,
  doesNotExistOperator,
];
