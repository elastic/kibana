/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';
import { hasTransformationalCommand } from '@kbn/esql-utils';

export interface AbsoluteRange {
  from: string;
  to: string;
}

export function toAbsoluteRange(timeRange: TimeRange): AbsoluteRange {
  const from = DateMath.parse(timeRange.from)?.toISOString();
  const to = DateMath.parse(timeRange.to, { roundUp: true })?.toISOString();
  if (!from || !to) {
    throw new Error(`Unable to parse time range: ${timeRange.from} - ${timeRange.to}`);
  }
  return { from, to };
}

export function computeComparisonTimeRange(current: AbsoluteRange): AbsoluteRange {
  const fromMs = new Date(current.from).getTime();
  const toMs = new Date(current.to).getTime();
  const durationMs = toMs - fromMs;
  return {
    from: new Date(fromMs - durationMs).toISOString(),
    to: new Date(toMs - durationMs).toISOString(),
  };
}

export function extractSourceFromEsqlQuery(query: string): string {
  if (!hasTransformationalCommand(query)) {
    return query.trim();
  }
  const pipeIndex = query.search(/\|\s*(stats|keep|promql)\b/i);
  return pipeIndex !== -1 ? query.slice(0, pipeIndex).replace(/\|\s*$/, '').trim() : query.trim();
}

export function buildForkFilterQuery({
  userQuery,
  timeField,
  current,
  previous,
}: {
  userQuery: string;
  timeField: string;
  current: AbsoluteRange;
  previous: AbsoluteRange;
}): string {
  const source = extractSourceFromEsqlQuery(userQuery);
  const shiftMs = new Date(current.from).getTime() - new Date(previous.from).getTime();
  return [
    source,
    `| FORK`,
    `  (WHERE ${timeField} >= "${current.from}" AND ${timeField} < "${current.to}")`,
    `  (WHERE ${timeField} >= "${previous.from}" AND ${timeField} < "${previous.to}" | EVAL ${timeField} = ${timeField} + ${shiftMs} milliseconds)`,
  ].join('\n');
}
