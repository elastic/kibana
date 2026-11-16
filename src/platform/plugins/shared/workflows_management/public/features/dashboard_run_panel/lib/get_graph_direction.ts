/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutDirection } from '@kbn/workflows';
import type { WorkflowGraphSize } from '@kbn/workflows-ui';
import type { WorkflowRunGraphLayout } from '../../../../server/dashboard_run_panel/schema';

/** The largest zoom the panel graph is drawn at. */
export const GRAPH_MAX_ZOOM = 1;

interface Size {
  width: number;
  height: number;
}

export interface GraphDirectionOptions {
  /** The graph's size in each direction; without it `auto` follows the panel's shape. */
  graphSizes?: Partial<Record<LayoutDirection, WorkflowGraphSize>>;
  /** The direction shown now, kept by `auto` while the panel is unmeasured or held. */
  current?: LayoutDirection;
  /** Keeps `current` whatever the panel size, for a resize that is only temporary. */
  hold?: boolean;
}

const getFitZoom = (panel: Size, graph: WorkflowGraphSize | undefined): number | undefined => {
  if (!graph || graph.width <= 0 || graph.height <= 0) return undefined;
  return Math.min(GRAPH_MAX_ZOOM, panel.width / graph.width, panel.height / graph.height);
};

/** The graph direction for a panel setting; `auto` picks the direction that draws the graph largest. */
export const getGraphDirection = (
  layout: WorkflowRunGraphLayout | undefined,
  panel: Size,
  { graphSizes, current, hold = false }: GraphDirectionOptions = {}
): LayoutDirection => {
  if (layout === 'horizontal') return 'LR';
  if (layout === 'vertical') return 'TB';
  if (hold && current) return current;

  const byShape: LayoutDirection = panel.width > panel.height ? 'LR' : 'TB';
  if (panel.width <= 0 || panel.height <= 0) return current ?? byShape;

  const horizontalZoom = getFitZoom(panel, graphSizes?.LR);
  const verticalZoom = getFitZoom(panel, graphSizes?.TB);
  if (horizontalZoom === undefined || verticalZoom === undefined) return byShape;
  if (horizontalZoom === verticalZoom) return byShape;
  return horizontalZoom > verticalZoom ? 'LR' : 'TB';
};
