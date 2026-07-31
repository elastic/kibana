/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import { getFilterExpressionLookupKey, type FilterExpressionValue } from './filter_input_codec';
import { projectRoutingCodec, type ProjectRoutingExpression } from './project_routing_codec';

export {
  type FilterExpressionValue,
  FilterOperator,
  type FilterOperatorLiteral,
} from './filter_input_codec';
export {
  projectRoutingCodec,
  type ProjectRoutingExpression,
  type ProjectRoutingStrategy,
  ROUTING_WILDCARD,
  PROJECT_SELECTION_DIMENSION,
} from './project_routing_codec';

export const createFilterExpressionsMap = (expressions: readonly FilterExpressionValue[]) =>
  new Map(
    expressions.map((expression) => [
      getFilterExpressionLookupKey(expression),
      { expression, enabled: true },
    ])
  );

export function reconcileDecodedRouting(
  decoded: ProjectRoutingExpression,
  availableProjectIds: readonly string[]
): { filterExpressions: FilterExpressionValue[]; excludedOverrides: string[] } {
  const excludedOverrides =
    decoded.selectedProjectIds.length > 0
      ? availableProjectIds.filter((id) => !decoded.selectedProjectIds.includes(id))
      : decoded.excludedProjectIds;

  return {
    filterExpressions: decoded.filterExpressions,
    excludedOverrides: [...excludedOverrides],
  };
}

export function parseDefaultProjectRouting(
  routing: ProjectRouting,
  availableProjectIds: readonly string[]
): { filterExpressions: FilterExpressionValue[]; excludedOverrides: string[] } {
  return reconcileDecodedRouting(projectRoutingCodec.decode(routing), availableProjectIds);
}
