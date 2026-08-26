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
import { getFilterExpressionLookupKey, type FilterExpressionValue } from './filter_input_codec';
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
 * Special-cases the legacy `PROJECT_ROUTING.ALL`/`PROJECT_ROUTING.ORIGIN` (`_alias:*`/
 * `_alias:_origin`) constants before delegating to the codec: the codec only understands
 * `_id`-based selection, so these would otherwise decode as a stray `_alias` tag filter that
 * no real project ever matches (aliases are real project names, never literally `*`/`_origin`).
 * `_alias:_origin` can only be resolved here, not in the codec itself, since it requires
 * knowing which available project id is the origin project — a codec-external concern.
 */
export function parseDefaultProjectRouting(
  routing: ProjectRouting,
  availableProjectIds: readonly string[],
  originProjectId?: string
): { filterExpressions: FilterExpressionValue[]; excludedOverrides: string[] } {
  if (routing === PROJECT_ROUTING.ALL) {
    return { filterExpressions: [], excludedOverrides: [] };
  }

  if (routing === PROJECT_ROUTING.ORIGIN && originProjectId) {
    return {
      filterExpressions: [],
      excludedOverrides: availableProjectIds.filter((id) => id !== originProjectId),
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
