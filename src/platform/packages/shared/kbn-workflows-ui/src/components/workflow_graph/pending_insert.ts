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
import type { InsertionPoints } from './compute_insertion_points';
import { errorPortCenter } from './port_geometry';
import {
  absoluteNodeBounds,
  nodeEntryPoint,
  nodeExitPoint,
  WORKFLOW_NODE_SEP,
  WORKFLOW_RANK_SEP,
} from './workflow_graph_geometry';
import type { AbsoluteBounds } from './workflow_graph_geometry';

/** Insertion sites that show an in-progress pending node on the canvas. */
export type PendingInsertStepContext =
  | {
      readonly mode: 'step';
      /** Source node id used to position the ghost card relative to the preceding node. */
      readonly sourceNodeId?: string;
    }
  | { readonly mode: 'error'; readonly stepId: string }
  | { readonly mode: 'trigger' };

/**
 * Ephemeral canvas placeholder while the user is inserting a step or trigger.
 * - `choosing`: Actions menu open — empty dashed card.
 * - `configuring`: Config panel open — filled solid card with icon + title.
 */
export type PendingInsertVisual =
  | { readonly phase: 'choosing'; readonly context: PendingInsertStepContext }
  | {
      readonly phase: 'configuring';
      readonly context: PendingInsertStepContext;
      readonly stepType: string;
      readonly label: string;
    };

/**
 * Matches the laid-out step node footprint (`DEFAULT_NODE_STYLE` in `@kbn/workflows`, not
 * exported — `pending_insert.test.ts` asserts these stay equal to the transform's node style).
 */
export const PENDING_NODE_WIDTH = 300;
export const PENDING_NODE_HEIGHT = 52;

/** Same edge-to-edge gap dagre uses between sequential ranks. */
const PENDING_NODE_GAP = WORKFLOW_RANK_SEP;

interface AbsoluteExtent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const pendingNodeSize = { width: PENDING_NODE_WIDTH, height: PENDING_NODE_HEIGHT };

const toExtent = ({ x, y, width, height }: AbsoluteBounds): AbsoluteExtent => ({
  minX: x,
  minY: y,
  maxX: x + width,
  maxY: y + height,
});

/** Absolute bounds of `id`; a node without a measured size is taken as a normal step card. */
const pendingBoundsOf = (
  id: string,
  byId: ReadonlyMap<string, Node>
): AbsoluteBounds | undefined => {
  const node = byId.get(id);
  return node ? absoluteNodeBounds(node, byId, pendingNodeSize) : undefined;
};

/** Node the pending card hangs after (previous top-level step, trigger, or error owner). */
const resolvePendingSourceId = (
  context: PendingInsertStepContext,
  nodes: readonly Node[],
  _insertionPoints: InsertionPoints
): string | undefined => {
  if (context.mode === 'trigger') return undefined;
  if (context.mode === 'error') return context.stepId;
  if (context.sourceNodeId) return context.sourceNodeId;

  // No source node id (e.g. trigger flow port → prepend-step): fall back to last trigger.
  const triggers = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
  return triggers.length > 0 ? triggers[triggers.length - 1] : undefined;
};

/**
 * Flow-space top-left for the pending insert card, sized to a normal step node.
 */
export const computePendingInsertOrigin = (
  context: PendingInsertStepContext,
  nodes: readonly Node[],
  insertionPoints: InsertionPoints,
  direction: LayoutDirection
): { x: number; y: number } | undefined => {
  const isHorizontal = direction === 'LR';
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Error-path inserts have no ghost card yet (known deviation #4, ADR-0012: reservedLanes placement).
  if (context.mode === 'error') return undefined;

  if (context.mode === 'trigger') {
    const triggers = nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) {
      // Empty canvas — pending node centers itself in the viewport.
      return undefined;
    }
    const lastBounds = pendingBoundsOf(triggers[triggers.length - 1].id, byId);
    if (!lastBounds) return undefined;
    const last = toExtent(lastBounds);
    // Match the ghost "+" placement: past the last trigger on the cross-axis.
    return isHorizontal
      ? {
          x: (last.minX + last.maxX) / 2 - PENDING_NODE_WIDTH / 2,
          y: last.maxY + WORKFLOW_NODE_SEP,
        }
      : {
          x: last.maxX + WORKFLOW_NODE_SEP,
          y: (last.minY + last.maxY) / 2 - PENDING_NODE_HEIGHT / 2,
        };
  }

  if (context.sourceNodeId) {
    const sourceBounds = pendingBoundsOf(context.sourceNodeId, byId);
    if (sourceBounds) {
      const source = toExtent(sourceBounds);
      return isHorizontal
        ? {
            x: source.maxX + PENDING_NODE_GAP,
            y: (source.minY + source.maxY) / 2 - PENDING_NODE_HEIGHT / 2,
          }
        : {
            x: (source.minX + source.maxX) / 2 - PENDING_NODE_WIDTH / 2,
            y: source.maxY + PENDING_NODE_GAP,
          };
    }
  }

  // Truly empty canvas (no triggers/steps): no layout anchor — pending node
  // centers itself in the viewport.
  return undefined;
};

/** Endpoints for the overlay edge drawn into the pending insert card. */
export interface PendingInsertConnector {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly isFailure: boolean;
}

/**
 * Source handle of the preceding node → target handle on the pending card.
 * Always drawn so the placeholder reads as connected, including mid-spine inserts.
 */
export const computePendingInsertConnector = (
  context: PendingInsertStepContext,
  origin: { readonly x: number; readonly y: number },
  nodes: readonly Node[],
  insertionPoints: InsertionPoints,
  direction: LayoutDirection
): PendingInsertConnector | undefined => {
  if (context.mode === 'trigger') return undefined;
  const sourceId = resolvePendingSourceId(context, nodes, insertionPoints);
  if (!sourceId) return undefined;
  const sourceBounds = pendingBoundsOf(sourceId, new Map(nodes.map((n) => [n.id, n])));
  if (!sourceBounds) return undefined;

  const isFailure = context.mode === 'error';
  const target = nodeEntryPoint({ x: origin.x, y: origin.y, ...pendingNodeSize }, direction);

  // Failure drops from the bottom-right corner into the reserved below+right slot;
  // otherwise leave the source's flow exit. Both enter the card's entry edge.
  const { x: sourceX, y: sourceY } = isFailure
    ? errorPortCenter(toExtent(sourceBounds), direction)
    : nodeExitPoint(sourceBounds, direction);
  return { sourceX, sourceY, targetX: target.x, targetY: target.y, isFailure };
};
