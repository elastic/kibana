/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { AlertsFiltersExpression, AlertsFilter } from '../types';
import { alertsFiltersMetadata } from '../filters';

const boolOperatorsToEsQuery: Record<AlertsFiltersExpression['operator'], keyof QueryDslBoolQuery> =
  {
    and: 'must',
    or: 'should',
  };

export const alertsFiltersToEsQuery = (alertsFilters: AlertsFiltersExpression) => {
  const traverse = (
    node: AlertsFiltersExpression | AlertsFilter
  ): QueryDslQueryContainer | null => {
    if ('operator' in node) {
      const operands = node.operands.map((operand) => traverse(operand)).filter(Boolean);
      if (!operands.length) {
        return null;
      }
      return {
        bool: {
          [boolOperatorsToEsQuery[node.operator]]: operands,
        },
      };
    } else {
      if (!node.type) {
        // The filter is empty, ignore it
        return null;
      }
      const { toEsQuery, isEmpty } = alertsFiltersMetadata[node.type];
      const value = node.value as Parameters<typeof toEsQuery>[0] | undefined;
      if (isEmpty(value)) {
        // The filter value is empty, ignore it
        return null;
      }
      return toEsQuery(value!);
    }
  };
  return traverse(alertsFilters) as QueryDslBoolQuery;
};
