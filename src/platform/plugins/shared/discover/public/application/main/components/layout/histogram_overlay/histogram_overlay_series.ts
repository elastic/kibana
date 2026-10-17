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
import type { CountSparkline, ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { FetchStatus } from '../../../../types';
import type { DiscoverHistogramOverlaySelection } from '../../../state_management/redux/runtime_state';

/** Returns the output field when the query groups by exactly one CATEGORIZE expression. */
export const getSingleCategorizeGroupField = (
  groupByFields: ESQLStatsQueryMeta['groupByFields']
): string | undefined => {
  const fields = groupByFields.filter(({ type }) => type === 'categorize');
  return fields.length === 1 ? fields[0].field : undefined;
};

/** Reads a dense numeric sparkline, rejecting empty or non-finite values. */
export const readSparklineValues = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const values: number[] = [];

  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) {
      return undefined;
    }

    values.push(entry);
  }

  return values;
};

const resolveBound = (
  bound: CountSparkline['from'],
  timeRange: TimeRange | undefined
): string | undefined => {
  if (bound.kind === 'date') {
    return dateMath.parse(bound.value)?.toISOString() ?? undefined;
  }

  if (!timeRange) {
    return undefined;
  }

  if (bound.value === '_tstart') {
    return dateMath.parse(timeRange.from)?.toISOString() ?? undefined;
  }

  if (bound.value === '_tend') {
    return dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? undefined;
  }

  return undefined;
};

const soleExpandedRowId = (
  expanded: Record<string, boolean> | boolean | undefined
): string | undefined => {
  if (!expanded || typeof expanded === 'boolean') {
    return undefined;
  }

  const expandedIds = Object.entries(expanded)
    .filter(([, isExpanded]) => isExpanded)
    .map(([id]) => id);

  return expandedIds.length === 1 ? expandedIds[0] : undefined;
};

/** Decides whether a snapshot may publish, must keep the current selection, or must clear it. */
export const resolveHistogramOverlayPublication = ({
  fetchStatus,
  rowsQuery,
  currentQuery,
  expanded,
  selectedNodeId,
}: {
  fetchStatus: FetchStatus;
  rowsQuery: string | undefined;
  currentQuery: string;
  expanded: Record<string, boolean> | boolean | undefined;
  selectedNodeId: string | undefined;
}): 'publish' | 'preserve' | 'clear' => {
  const expandedNodeId = soleExpandedRowId(expanded);

  if (fetchStatus === FetchStatus.ERROR || expandedNodeId === undefined) {
    return 'clear';
  }

  if (fetchStatus !== FetchStatus.PARTIAL && fetchStatus !== FetchStatus.COMPLETE) {
    return selectedNodeId === undefined || expandedNodeId === selectedNodeId ? 'preserve' : 'clear';
  }

  return rowsQuery === currentQuery ? 'publish' : 'preserve';
};

/** Builds the histogram series from an already-resolved sparkline, label, and stable row id. */
export const buildHistogramOverlaySeries = ({
  nodeId,
  label,
  values,
  query,
  timeRange,
  sparkline,
}: {
  nodeId: string;
  label: string;
  values: number[];
  query: string;
  timeRange: TimeRange;
  sparkline: CountSparkline;
}): DiscoverHistogramOverlaySelection | undefined => {
  const from = resolveBound(sparkline.from, timeRange);
  const to = resolveBound(sparkline.to, timeRange);

  if (!from || !to || values.length === 0) {
    return undefined;
  }

  return {
    nodeId,
    key: `${nodeId}|${query}|${from}|${to}`,
    label,
    values,
    timeField: sparkline.timeField,
    from,
    to,
    sourceQuery: query,
    sourceTimeRange: { from: timeRange.from, to: timeRange.to },
    isSampled: sparkline.isSampled,
    ...(sparkline.sampleProbability !== undefined
      ? { sampleProbability: sparkline.sampleProbability }
      : {}),
  };
};
