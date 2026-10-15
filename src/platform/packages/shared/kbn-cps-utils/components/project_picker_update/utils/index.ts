/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from './filter_input_codec';
import {
  encodeFilterOnlyRouting,
  projectRoutingCodec,
  type ProjectRoutingExpression,
} from './project_routing_codec';

export {
  type FilterExpressionValue,
  FilterOperator,
  type FilterOperatorLiteral,
} from './filter_input_codec';
export {
  projectRoutingCodec,
  encodeFilterOnlyRouting,
  type ProjectRoutingExpression,
  type ProjectRoutingStrategy,
  ROUTING_WILDCARD,
  PROJECT_SELECTION_DIMENSION,
} from './project_routing_codec';

/** EXISTS `_alias` — the filter half of `PROJECT_ROUTING.ORIGIN` (`_alias:_origin`). */
export const ALIAS_EXISTS_FILTER: FilterExpressionValue = {
  operator: FilterOperator.EXISTS,
  tagName: '_alias',
  tagValue: undefined,
};

export const isAliasExistsFilter = (expression: FilterExpressionValue): boolean =>
  expression.operator === FilterOperator.EXISTS && expression.tagName === '_alias';

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

/**
 * Parses a project routing string into filter expressions and excluded-project overrides.
 *
 * `PROJECT_ROUTING.ALL` / `PROJECT_ROUTING.ORIGIN` (`_alias:*` / `_alias:_origin`) are closed
 * shapes handled here and never passed to the codec. ALL is EXISTS `_alias` with no exclusions;
 * ORIGIN is the same filter plus exclusions of every non-origin project.
 */
export function parseDefaultProjectRouting(
  routing: ProjectRouting,
  availableProjectIds: readonly string[],
  originProjectId?: string
): { filterExpressions: FilterExpressionValue[]; excludedOverrides: string[] } {
  if (routing === PROJECT_ROUTING.ALL) {
    return { filterExpressions: [ALIAS_EXISTS_FILTER], excludedOverrides: [] };
  }

  if (routing === PROJECT_ROUTING.ORIGIN) {
    return {
      filterExpressions: [ALIAS_EXISTS_FILTER],
      excludedOverrides: originProjectId
        ? availableProjectIds.filter((id) => id !== originProjectId)
        : [],
    };
  }

  return reconcileDecodedRouting(projectRoutingCodec.decode(routing), availableProjectIds);
}

/**
 * Whether two routing strings describe the same filters and exclusions.
 *
 * Compares parsed filter identity and exclusion sets rather than the strings themselves:
 * re-encoding is not string-stable (`snapshot` expands `_id:…`; `dynamic` can collapse
 * equivalent clauses), so byte equality would treat a no-op round-trip as a change.
 */
export function areProjectRoutingsEquivalent(
  left: ProjectRouting,
  right: ProjectRouting,
  availableProjectIds: readonly string[],
  originProjectId?: string
): boolean {
  const parsedLeft = parseDefaultProjectRouting(left, availableProjectIds, originProjectId);
  const parsedRight = parseDefaultProjectRouting(right, availableProjectIds, originProjectId);

  const filtersMatch =
    (encodeFilterOnlyRouting(parsedLeft.filterExpressions) ?? '') ===
    (encodeFilterOnlyRouting(parsedRight.filterExpressions) ?? '');

  if (!filtersMatch) {
    return false;
  }

  const rightExclusions = new Set(parsedRight.excludedOverrides);
  return (
    parsedLeft.excludedOverrides.length === rightExclusions.size &&
    parsedLeft.excludedOverrides.every((id) => rightExclusions.has(id))
  );
}
