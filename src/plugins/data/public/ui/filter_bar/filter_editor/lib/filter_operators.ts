/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS } from '../../../../../common/es_query/filters';

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;
  fieldTypes?: string[];
}

export const isOperator = {
  message: i18n.translate('data.filter.filterEditor.isOperatorOptionLabel', {
    defaultMessage: 'is',
  }),
  type: FILTERS.PHRASE,
  negate: false,
};

export const isNotOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOperatorOptionLabel', {
    defaultMessage: 'is not',
  }),
  type: FILTERS.PHRASE,
  negate: true,
};

export const isOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isOneOfOperatorOptionLabel', {
    defaultMessage: 'is one of',
  }),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isNotOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
    defaultMessage: 'is not one of',
  }),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isBetweenOperatorOptionLabel', {
    defaultMessage: 'is between',
  }),
  type: FILTERS.RANGE,
  negate: false,
  fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
};

export const isNotBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
    defaultMessage: 'is not between',
  }),
  type: FILTERS.RANGE,
  negate: true,
  fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
};

export const existsOperator = {
  message: i18n.translate('data.filter.filterEditor.existsOperatorOptionLabel', {
    defaultMessage: 'exists',
  }),
  type: FILTERS.EXISTS,
  negate: false,
};

export const doesNotExistOperator = {
  message: i18n.translate('data.filter.filterEditor.doesNotExistOperatorOptionLabel', {
    defaultMessage: 'does not exist',
  }),
  type: FILTERS.EXISTS,
  negate: true,
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
];
