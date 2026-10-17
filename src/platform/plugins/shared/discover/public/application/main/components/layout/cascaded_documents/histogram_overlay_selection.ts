/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import type { CountSparkline, ESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { DiscoverHistogramOverlaySelection } from '../../../state_management/redux/runtime_state';
import {
  buildHistogramOverlaySeries,
  getSingleCategorizeGroupField,
  readSparklineValues,
} from '../histogram_overlay/histogram_overlay_series';
import type { ESQLDataGroupNode } from './blocks/types';

export { resolveHistogramOverlayPublication } from '../histogram_overlay/histogram_overlay_series';

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
  const categorizeField = getSingleCategorizeGroupField(queryMeta.groupByFields);

  if (!expanded || typeof expanded === 'boolean' || !categorizeField || !sparkline || !timeRange) {
    return undefined;
  }

  const expandedNodes = nodes.filter((node) => expanded[node.id]);

  if (expandedNodes.length !== 1) {
    return undefined;
  }

  const [node] = expandedNodes;

  if (node.groupColumn !== categorizeField) {
    return undefined;
  }

  const values = readSparklineValues(node.aggregatedValues[sparkline.column]);

  if (!values) {
    return undefined;
  }

  return buildHistogramOverlaySeries({
    nodeId: node.id,
    label: node.groupValue,
    values,
    query,
    timeRange,
    sparkline,
  });
};
