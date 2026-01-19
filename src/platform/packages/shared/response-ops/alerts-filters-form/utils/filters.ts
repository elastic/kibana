/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression } from '@kbn/es-query';
import { toElasticsearchQuery } from '@kbn/es-query/src/kuery/ast';
import type {
  AlertsFilter,
  AlertsFiltersExpression,
  AlertsFiltersExpressionItem,
  AlertsFiltersExpressionOperator,
} from '../types';
import { getFilterMetadata } from '../filters_metadata';

export const isFilter = (item?: AlertsFiltersExpressionItem): item is { filter: AlertsFilter } =>
  item != null && 'filter' in item;

export const isOperator = (
  item?: AlertsFiltersExpressionItem
): item is { operator: AlertsFiltersExpressionOperator } => item != null && 'operator' in item;

export const isEmptyExpression = (expression: AlertsFiltersExpression) => {
  // An expression is considered empty if it does not have any elements
  if (!Boolean(expression?.length)) {
    return true;
  }
  // Or one empty filter
  const item = expression[0];
  if (isFilter(item)) {
    if (!item.filter.type) {
      return true;
    }
    const { isEmpty } = getFilterMetadata(item.filter.type);
    return isEmpty(item.filter.value);
  }
  return false;
};

export const alertsFiltersToEsQuery = (expression: AlertsFiltersExpression) => {
  const kuery = expression.reduce((kqlExpression, item, index) => {
    if (isFilter(item) && item.filter.type) {
      const { type, value } = item.filter;
      const { toKql } = getFilterMetadata(type);
      const filterKqlExpression = toKql(value);
      if (filterKqlExpression) {
        kqlExpression += ` ${filterKqlExpression} `;
      }
    }

    if (isOperator(item) && index > 0) {
      const { operator } = item;
      if (index > 0) {
        kqlExpression += ` ${operator} `;
      }
    }
    return kqlExpression;
  }, '');
  return toElasticsearchQuery(fromKueryExpression(kuery));
};
