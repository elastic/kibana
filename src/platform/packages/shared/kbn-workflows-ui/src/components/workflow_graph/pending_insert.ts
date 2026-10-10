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
import { WORKFLOW_NODE_SEP, WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

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

/** Matches the laid-out step node footprint (`DEFAULT_NODE_STYLE`). */
export const PENDING_NODE_WIDTH = 300;
export const PENDING_NODE_HEIGHT = 56;

/** Same edge-to-edge gap dagre uses between sequential ranks. */
const PENDING_NODE_GAP = WORKFLOW_RANK_SEP;

interface AbsoluteBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const absoluteBoundsOf = (id: string, nodes: readonly Node[]): AbsoluteBounds | undefined => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const node = byId.get(id);
  if (!node) return undefined;
  let { x, y } = node.position;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  const w = typeof node.width === 'number' ? node.width : PENDING_NODE_WIDTH;
  const h = typeof node.height === 'number' ? node.height : PENDING_NODE_HEIGHT;
  return { minX: x, minY: y, maxX: x + w, maxY: y + h };
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
 * Error-path pending card origin + lane-insertion shifts (same algorithm as
 * committed on-failure layout). Canvas applies `shifts` so the placeholder
 * never overlaps and nothing jumps on confirm.
 */
/**
 * POC stub — error-branch placement ghost uses the branch's reservedLanes
 * model (ADR-0012); the POC's error_branch_placement.ts geometry was removed.
 * The ghost card does not appear for fallback inserts for now (known deviation #4).
 */
export const computePendingErrorBranchPlacement = (
  _stepId: string,
  _nodes: readonly Node[],
  _direction: LayoutDirection
):
  | {
      origin: { x: number; y: number };
      shifts: ReadonlyMap<string, { dx: number; dy: number }>;
    }
  | undefined => undefined;

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

  if (context.mode === 'error') {
    return computePendingErrorBranchPlacement(context.stepId, nodes, direction)?.origin;
  }

  if (context.mode === 'trigger') {
    const triggers = nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) {
      // Empty canvas — pending node centers itself in the viewport.
      return undefined;
    }
    const last = absoluteBoundsOf(triggers[triggers.length - 1].id, nodes);
    if (!last) return undefined;
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
    const source = absoluteBoundsOf(context.sourceNodeId, nodes);
    if (source) {
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
  const source = absoluteBoundsOf(sourceId, nodes);
  if (!source) return undefined;

  const isHorizontal = direction === 'LR';
  const isFailure = context.mode === 'error';

  if (isFailure) {
    const originPoint = errorPortCenter(source, direction);
    // Drop from the bottom-right corner into the reserved below+right slot:
    // TB enters the top center; LR enters the left-edge center.
    return {
      sourceX: originPoint.x,
      sourceY: originPoint.y,
      targetX: isHorizontal ? origin.x : origin.x + PENDING_NODE_WIDTH / 2,
      targetY: isHorizontal ? origin.y + PENDING_NODE_HEIGHT / 2 : origin.y,
      isFailure: true,
    };
  }

  if (isHorizontal) {
    return {
      sourceX: source.maxX,
      sourceY: (source.minY + source.maxY) / 2,
      targetX: origin.x,
      targetY: origin.y + PENDING_NODE_HEIGHT / 2,
      isFailure: false,
    };
  }
  return {
    sourceX: (source.minX + source.maxX) / 2,
    sourceY: source.maxY,
    targetX: origin.x + PENDING_NODE_WIDTH / 2,
    targetY: origin.y,
    isFailure: false,
  };
};
