/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import type { LayoutDirection } from '@kbn/workflows';

/*
 * Single home for the geometry shared by the layout pipeline, the edge router and
 * the insertion overlays. This module imports nothing from them, so the layout
 * (pure) never depends on UI overlay code.
 */

// Fork single-bus routing: distance from the source handle to the shared
// horizontal bus (TB) or vertical bus (LR). Used for all branching edges
// (switch case/default, if-then, if-else). Labels are anchored at a further
// fixed offset below/right of the bus so all branch labels sit on an aligned
// row (TB) / column (LR) regardless of sibling node heights.
export const FORK_BUS_TRUNK = 20;
export const FORK_BUS_LABEL_OFFSET = 20;

// Merge single-bus routing: distance from the shared horizontal bus (TB) or
// vertical bus (LR) to the target handle. Mirrors FORK_BUS_TRUNK so the
// fan-in and fan-out bus trunks are the same length.
export const MERGE_BUS_TRUNK = 20;

/** Rest-state / expanded / hit sizes — kept here so geometry tests share one source. */
export const PORT_DOT_SIZE = 8;
export const PORT_EXPANDED_SIZE = 20;
/** Invisible hit target — must stay ≥44 so the control is never the only clickable area. */
export const PORT_HIT_SIZE = 44;

/**
 * Outset that places the control centre ≈15px outside the source edge
 * (prompt: just outside the node's outgoing edge). Hit padding expands around
 * that centre without contributing layout size to the node.
 */
export const PORT_EDGE_OUTSET = 15;

/**
 * Stub length from the last node's exit edge to the terminal + tip.
 * Longer than inter-rank spacing so the terminal insert control is visually
 * distinct from mid-wire controls and the + tip doesn't crowd the node.
 */
export const TERMINAL_STUB_PX = 75;

/** Diameter of the circular + button rendered by WorkflowGraphWireSplitControl. */
export const WIRE_CONTROL_SIZE = 22;
/** Minimum clearance (px) between the button edge and an adjacent element (chip, card, bus). */
export const WIRE_CONTROL_CLEARANCE = 14;
/** Half-height of the branch chip (including its 1px border). */
export const FORK_CHIP_HALF_HEIGHT = 11;
/**
 * Distance from the fork node exit to the fork-head + button centre (TB direction).
 * Derived from: FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET + FORK_CHIP_HALF_HEIGHT
 *   + WIRE_CONTROL_CLEARANCE + WIRE_CONTROL_SIZE / 2
 *   = 20 + 20 + 11 + 14 + 11 = 76.
 */
export const FORK_HEAD_PLUS_OFFSET =
  FORK_BUS_TRUNK +
  FORK_BUS_LABEL_OFFSET +
  FORK_CHIP_HALF_HEIGHT +
  WIRE_CONTROL_CLEARANCE +
  WIRE_CONTROL_SIZE / 2;
/**
 * Minimum main-axis gap the layout must reserve between a fork node's bottom
 * and its branch heads so the fork-head + button fits without overlapping.
 * = FORK_HEAD_PLUS_OFFSET + WIRE_CONTROL_SIZE / 2 + WIRE_CONTROL_CLEARANCE
 * = 76 + 11 + 14 = 101.
 */
export const FORK_HEAD_MIN_GAP =
  FORK_HEAD_PLUS_OFFSET + WIRE_CONTROL_SIZE / 2 + WIRE_CONTROL_CLEARANCE;

/** Extra room below the terminal stub tip so the stub stays visible inside a container. */
export const TERMINAL_STUB_MARGIN = 17;

// Workflow-specific layout constants. These encode domain knowledge (foreach
// header height, gutter widths) that does not belong in @kbn/dag-layout.
// bottom = TERMINAL_STUB_PX (75) + PORT_DOT_SIZE/2 (4) + margin (17) = 96.
// This keeps the terminal stub of the last inner step visible inside the container.
export const WORKFLOW_COMPOUND_PADDING = {
  top: 70,
  right: 32,
  bottom: TERMINAL_STUB_PX + PORT_DOT_SIZE / 2 + TERMINAL_STUB_MARGIN,
  left: 32,
} as const;
export const WORKFLOW_NODE_SEP = 50;
export const WORKFLOW_RANK_SEP = 70;

export interface GraphPoint {
  readonly x: number;
  readonly y: number;
}

export interface AbsoluteBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Absolute (flow-space) bounds; walks the parentId chain for nested nodes.
 * `byId` is built once by the caller; a missing width/height uses `fallbackSize`.
 */
export const absoluteNodeBounds = (
  node: Node,
  byId: ReadonlyMap<string, Node>,
  fallbackSize: { readonly width: number; readonly height: number } = { width: 0, height: 0 }
): AbsoluteBounds => {
  let { x, y } = node.position;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  const width = typeof node.width === 'number' ? node.width : fallbackSize.width;
  const height = typeof node.height === 'number' ? node.height : fallbackSize.height;
  return { x, y, width, height };
};

/** Where a wire leaves a node: right-edge centre in LR, bottom-edge centre in TB. */
export const nodeExitPoint = (bounds: AbsoluteBounds, direction: LayoutDirection): GraphPoint =>
  direction === 'LR'
    ? { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
    : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };

/** Where a wire enters a node: left-edge centre in LR, top-edge centre in TB. */
export const nodeEntryPoint = (bounds: AbsoluteBounds, direction: LayoutDirection): GraphPoint =>
  direction === 'LR'
    ? { x: bounds.x, y: bounds.y + bounds.height / 2 }
    : { x: bounds.x + bounds.width / 2, y: bounds.y };
