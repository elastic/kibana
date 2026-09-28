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
import type { ESQLDataGroupNode } from './blocks/types';

const readSparklineValues = (
  value: number | Array<string | number> | undefined
): number[] | undefined => {
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

export const buildHistogramOverlaySelection = ({
  expanded,
  nodes,
  query,
  timeRange,
  queryMeta,
  sparkline,
}: {
  expanded: Record<string, boolean> | boolean | undefined;
  nodes: ESQLDataGroupNode[];
  query: string;
  timeRange: TimeRange | undefined;
  queryMeta: ESQLStatsQueryMeta;
  sparkline: CountSparkline | undefined;
}): DiscoverHistogramOverlaySelection | undefined => {
  const categorizeFields = queryMeta.groupByFields.filter((field) => field.type === 'categorize');

  if (
    !expanded ||
    typeof expanded === 'boolean' ||
    categorizeFields.length !== 1 ||
    !sparkline ||
    !timeRange
  ) {
    return undefined;
  }

  const expandedNodes = nodes.filter((node) => expanded[node.id]);

  if (expandedNodes.length !== 1) {
    return undefined;
  }

  const [node] = expandedNodes;

  if (node.groupColumn !== categorizeFields[0].field) {
    return undefined;
  }

  const values = readSparklineValues(node.aggregatedValues[sparkline.column]);
  const from = resolveBound(sparkline.from, timeRange);
  const to = resolveBound(sparkline.to, timeRange);

  if (!values || !from || !to) {
    return undefined;
  }

  return {
    nodeId: node.id,
    key: `${node.id}|${query}|${from}|${to}`,
    label: node.groupValue,
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
