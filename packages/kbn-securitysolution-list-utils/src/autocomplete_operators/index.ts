/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { OperatorOption } from '../types';

export const isOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isOperatorLabel', {
    defaultMessage: 'is',
  }),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.MATCH,
  value: 'is',
};

export const isNotOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isNotOperatorLabel', {
    defaultMessage: 'is not',
  }),
  operator: OperatorEnum.EXCLUDED,
  type: OperatorTypeEnum.MATCH,
  value: 'is_not',
};

export const isOneOfOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isOneOfOperatorLabel', {
    defaultMessage: 'is one of',
  }),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.MATCH_ANY,
  value: 'is_one_of',
};

export const isNotOneOfOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isNotOneOfOperatorLabel', {
    defaultMessage: 'is not one of',
  }),
  operator: OperatorEnum.EXCLUDED,
  type: OperatorTypeEnum.MATCH_ANY,
  value: 'is_not_one_of',
};

export const existsOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.existsOperatorLabel', {
    defaultMessage: 'exists',
  }),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.EXISTS,
  value: 'exists',
};

export const doesNotExistOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.doesNotExistOperatorLabel', {
    defaultMessage: 'does not exist',
  }),
  operator: OperatorEnum.EXCLUDED,
  type: OperatorTypeEnum.EXISTS,
  value: 'does_not_exist',
};

export const isInListOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isInListOperatorLabel', {
    defaultMessage: 'is in list',
  }),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.LIST,
  value: 'is_in_list',
};

export const isNotInListOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.isNotInListOperatorLabel', {
    defaultMessage: 'is not in list',
  }),
  operator: OperatorEnum.EXCLUDED,
  type: OperatorTypeEnum.LIST,
  value: 'is_not_in_list',
};

export const matchesOperator: OperatorOption = {
  message: i18n.translate('lists.exceptions.matchesOperatorLabel', {
    defaultMessage: 'matches',
  }),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.WILDCARD,
  value: 'matches',
};

export const EVENT_FILTERS_OPERATORS: OperatorOption[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  matchesOperator,
];

export const EXCEPTION_OPERATORS: OperatorOption[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  existsOperator,
  doesNotExistOperator,
  isInListOperator,
  isNotInListOperator,
  matchesOperator,
];

export const EXCEPTION_OPERATORS_SANS_LISTS: OperatorOption[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  existsOperator,
  doesNotExistOperator,
];

export const EXCEPTION_OPERATORS_ONLY_LISTS: OperatorOption[] = [
  isInListOperator,
  isNotInListOperator,
];
