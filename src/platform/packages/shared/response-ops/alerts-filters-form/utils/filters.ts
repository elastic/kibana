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
import type { AlertsFilter, AlertsFiltersExpression, AlertsFiltersExpressionItem } from '../types';
import { alertsFiltersMetadata, getFilterMetadata } from '../filters_metadata';

export const isFilter = (item?: AlertsFiltersExpressionItem): item is { filter: AlertsFilter } =>
  item != null && 'filter' in item;

export const isEmptyExpression = (expression: AlertsFiltersExpression) => {
  if (!Boolean(expression?.length)) {
    return true;
  }
  const item = expression[0];
  if (isFilter(item)) {
    if (!item.filter.type) {
      return true;
    }
    const { isEmpty } = getFilterMetadata(item.filter);
    return isEmpty();
  }
  return false;
};

export const alertsFiltersToEsQuery = (expression: AlertsFiltersExpression) => {
  const kuery = expression.reduce((kqlExpression, item, index) => {
    if (isFilter(item)) {
      const { type, value } = item.filter;
      if (type) {
        const { toKql } = alertsFiltersMetadata[type];
        const filterKqlExpression = toKql(value as Parameters<typeof toKql>[0]);
        if (filterKqlExpression) {
          kqlExpression += ` ${filterKqlExpression} `;
        }
      }
    } else {
      const { operator } = item;
      if (index > 0) {
        kqlExpression += ` ${operator} `;
      }
    }
    return kqlExpression;
  }, '');
  return toElasticsearchQuery(fromKueryExpression(kuery));
};
