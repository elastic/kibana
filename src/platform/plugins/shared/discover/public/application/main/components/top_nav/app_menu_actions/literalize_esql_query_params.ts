/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `??key` binds an *identifier* (a field or function name); `?key` binds a *value*. The
// lookaheads keep e.g. `?tstart2` from matching the `?tstart` token, and the lookbehind on the
// value regex keeps it from matching the trailing `?key` half of an unrelated `??key` token.
const identifierTokenPattern = (key: string) =>
  new RegExp(`\\?\\?${escapeRegExp(key)}(?![A-Za-z0-9_])`, 'g');
const valueTokenPattern = (key: string) =>
  new RegExp(`(?<!\\?)\\?${escapeRegExp(key)}(?![A-Za-z0-9_])`, 'g');

const escapeEsqlStringLiteral = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Formats a bound value as an ES|QL value literal: numbers stay bare, everything else becomes
 * a double-quoted (and escaped) string literal. */
const formatEsqlValueLiteral = (value: string | number): string =>
  typeof value === 'number' ? String(value) : `"${escapeEsqlStringLiteral(String(value))}"`;

/** Formats a bound value as an ES|QL identifier (for `??field`-style bindings), quoting with
 * backticks only if it isn't already a valid bare identifier. */
const formatEsqlIdentifier = (value: string): string =>
  /^[A-Za-z_@][A-Za-z0-9_]*$/.test(value) ? value : `\`${value.replace(/`/g, '``')}\``;

/**
 * Replaces every ES|QL query parameter used in `query` -- Discover's `?_tstart`/`?_tend`
 * time-range params, and any bound ES|QL Control variables (`?myVar`/`??myField`) -- with its
 * current literal value.
 *
 * This exists because ES|QL views can't contain query parameters at all: per
 * https://www.elastic.co/docs/reference/query-languages/esql/esql-views#_query_parameters,
 * "Query parameters are not allowed in the view definition". A query that runs fine live in
 * Discover (where Kibana supplies `_tstart`/`_tend`/control values alongside the request) is
 * rejected outright by Elasticsearch when saved as a view, since a view has no equivalent
 * mechanism to supply them later.
 *
 * Returns the (possibly unchanged) query, plus the names of any parameters that couldn't be
 * resolved to a literal (e.g. a stray `?foo` with no matching control, or `?_tstart`/`?_tend`
 * with no time range available) -- callers should refuse to save as a view while
 * `unresolvedParams` is non-empty, rather than let Elasticsearch reject it with an opaque error.
 */
export const literalizeEsqlQueryParams = (
  query: string,
  { esqlVariables, timeRange }: { esqlVariables?: ESQLControlVariable[]; timeRange?: TimeRange }
): { query: string; unresolvedParams: string[] } => {
  const paramsInQuery = [...new Set(getESQLQueryVariables(query))];
  if (!paramsInQuery.length) {
    return { query, unresolvedParams: [] };
  }

  let literalQuery = query;
  const unresolvedParams: string[] = [];

  for (const key of paramsInQuery) {
    if (key === '_tstart' || key === '_tend') {
      const resolved = timeRange
        ? key === '_tstart'
          ? dateMath.parse(timeRange.from)?.toISOString()
          : dateMath.parse(timeRange.to, { roundUp: true })?.toISOString()
        : undefined;
      if (!resolved) {
        unresolvedParams.push(key);
        continue;
      }
      literalQuery = literalQuery.replace(valueTokenPattern(key), formatEsqlValueLiteral(resolved));
      continue;
    }

    const variable = esqlVariables?.find(({ key: variableKey }) => variableKey === key);
    if (!variable) {
      unresolvedParams.push(key);
      continue;
    }

    if (variable.type === ESQLVariableType.FIELDS || variable.type === ESQLVariableType.FUNCTIONS) {
      literalQuery = literalQuery.replace(
        identifierTokenPattern(key),
        formatEsqlIdentifier(String(variable.value))
      );
      continue;
    }

    if (variable.type === ESQLVariableType.TIME_LITERAL) {
      // Timespan literals (e.g. "5 minutes") are written unquoted -- see "Timespan literals" in
      // https://www.elastic.co/docs/reference/query-languages/esql/esql-syntax.
      literalQuery = literalQuery.replace(valueTokenPattern(key), String(variable.value));
      continue;
    }

    // VALUES / MULTI_VALUES
    const literalValue = Array.isArray(variable.value)
      ? `(${variable.value.map(formatEsqlValueLiteral).join(', ')})`
      : formatEsqlValueLiteral(variable.value);
    literalQuery = literalQuery.replace(valueTokenPattern(key), literalValue);
  }

  return { query: literalQuery, unresolvedParams };
};
