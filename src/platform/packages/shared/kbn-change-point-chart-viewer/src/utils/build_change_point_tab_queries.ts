/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@elastic/datemath';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { ChangePointCardModel } from './derive_change_point_cards';
import { formatEsqlIdentifier, formatEsqlLiteral } from './append_entity_filters_to_line_esql';

// Resolves any time range bound (absolute ISO or relative expression) to epoch milliseconds.
// Returns undefined if the string cannot be parsed (e.g. "$timeFrom").
// roundUp=true is the Kibana convention for "to" bounds (e.g. "now/d" → end of day).
const toAbsoluteMs = (s: string, roundUp = false): number | undefined => {
  const parsed = dateMath.parse(s, { roundUp });
  return parsed?.isValid() ? parsed.valueOf() : undefined;
};

/**
 * Builds a raw-documents ESQL query for the focused Discover tab.
 *
 * Extracts the FROM source from lineEsql and appends WHERE predicates derived
 * from entityValues. The STATS / CHANGE_POINT pipeline is intentionally omitted
 * so Discover shows individual events rather than aggregated rows.
 *
 * Returns undefined when the FROM source cannot be extracted from the query.
 */
export const buildFocusedViewRawQuery = (
  lineEsql: string,
  entityValues: Readonly<Record<string, string>>
): string | undefined => {
  const fromClause = lineEsql.match(/^FROM[^|]+/i)?.[0]?.trim();
  if (!fromClause) return undefined;

  const predicates = Object.entries(entityValues)
    .map(([col, val]) => {
      const lit = formatEsqlLiteral(val);
      return lit !== undefined ? `${formatEsqlIdentifier(col)} == ${lit}` : undefined;
    })
    .filter((p): p is string => p !== undefined);

  return predicates.length > 0 ? `${fromClause} | WHERE ${predicates.join(' AND ')}` : fromClause;
};

/**
 * Builds a focused time range centred on all of the card's change-point annotations.
 *
 * Both absolute ISO and relative bounds (e.g. "now-30d") are resolved to milliseconds
 * via datemath before computing the focused window. The window spans from
 * (earliest annotation − 3% of total range) to (latest annotation + 3% of total range),
 * clamped to the original bounds.
 * Returns undefined if the time range cannot be resolved.
 */
export const buildFocusedViewTimeRange = (
  annotationEvents: ChangePointCardModel['annotationEvents'],
  chartTimeRange: TimeRange
): TimeRange | undefined => {
  const timestamps = annotationEvents.map((e) => new Date(e.datetime).getTime());
  const earliestMs = Math.min(...timestamps);
  const latestMs = Math.max(...timestamps);

  const fromMs = toAbsoluteMs(chartTimeRange.from);
  const toMs = toAbsoluteMs(chartTimeRange.to, true);

  if (fromMs !== undefined && toMs !== undefined) {
    const padding = (toMs - fromMs) * 0.03;
    return {
      from: new Date(Math.max(fromMs, earliestMs - padding)).toISOString(),
      to: new Date(Math.min(toMs, latestMs + padding)).toISOString(),
    };
  }
};
