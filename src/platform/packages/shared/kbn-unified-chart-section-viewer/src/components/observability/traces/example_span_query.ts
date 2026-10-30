/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectionToEsqlCondition } from '@kbn/trace-latency-map';
import type { LatencyMapCell } from '@kbn/trace-latency-map';

/**
 * The newest span of a clicked cell, with every field, for the document flyout. The cell's
 * condition is the map's own (`selectionToEsqlCondition`), so the span opened is one the
 * cell counted. Each condition in brackets: a host's `a OR b` would otherwise escape the
 * cell. `SET unmapped_fields="NULLIFY"` keeps one query working on classic-only, OTel-only
 * and mixed clusters, as in the map's queries.
 */
export function buildExampleSpanQuery({
  indexPattern,
  filters,
  cell,
}: {
  indexPattern: string;
  filters: string[];
  cell: LatencyMapCell;
}): string {
  const conditions = [selectionToEsqlCondition(cell), ...filters];
  return [
    'SET unmapped_fields="NULLIFY";',
    `FROM ${indexPattern}`,
    `| WHERE ${conditions.map((condition) => `(${condition})`).join(' AND ')}`,
    '| SORT @timestamp DESC',
    '| LIMIT 1',
  ].join('\n');
}
