/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LatencyMapSelection, LatencyMapUnit } from '../types';
import {
  FAILED_SPAN_CONDITION,
  ROOT_SPAN_CONDITION,
  durationRangeCondition,
} from '../query/fields';

/**
 * The ES|QL condition of a selection: its time window, its duration range and, when it is
 * about failures, the failed spans. Over raw fields, so Elasticsearch filters it with its
 * index, and so a host can append it to any query over trace data.
 *
 * A map of traces selects their root spans, and a map scoped to some spans (one service's
 * calls, say) carries its scope, so the condition selects what the map showed.
 */
export function selectionToEsqlCondition(
  selection: LatencyMapSelection,
  { unit, scope }: { unit?: LatencyMapUnit; scope?: string } = {}
): string {
  const conditions = [
    `@timestamp >= TO_DATETIME("${new Date(selection.from).toISOString()}")`,
    `@timestamp < TO_DATETIME("${new Date(selection.to).toISOString()}")`,
    `(${durationRangeCondition(selection.minDurationUs, selection.maxDurationUs)})`,
    ...(selection.failedOnly ? [FAILED_SPAN_CONDITION] : []),
    ...(unit === 'traces' ? [`(${ROOT_SPAN_CONDITION})`] : []),
    ...(scope ? [`(${scope})`] : []),
  ];
  return conditions.join(' AND ');
}
