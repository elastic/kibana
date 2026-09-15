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
import type { WorkflowStepInsertPath } from './workflow_graph_actions_context';
import {
  resolveErrorBranchPlacement,
  type ErrorBranchPlacementResult,
} from './error_branch_placement';
import { errorPortCenter } from './port_geometry';
import { WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

/** Insertion sites that show an in-progress pending node (triggers insert immediately). */
export type PendingInsertStepContext =
  | {
      readonly mode: 'step';
      readonly index: number;
      readonly path?: WorkflowStepInsertPath;
      readonly sourceNodeId?: string;
    }
  | { readonly mode: 'error'; readonly stepId: string };

/**
 * Ephemeral canvas placeholder while the user is inserting a step.
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

/** Matches the laid-out step node footprint. */
export const PENDING_NODE_WIDTH = 300;
export const PENDING_NODE_HEIGHT = 64;

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
  insertionPoints: InsertionPoints
): string | undefined => {
  if (context.mode === 'error') return context.stepId;
  if (context.sourceNodeId) return context.sourceNodeId;

  const { index, path } = context;
  if (path && path.length > 0) {
    return insertionPoints.topLevelStepNodeIds[path[0]?.stepIndex ?? -1];
  }

  const topLevel = insertionPoints.topLevelStepNodeIds;
  if (index > 0) return topLevel[index - 1];

  const triggers = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
  return triggers.length > 0 ? triggers[triggers.length - 1] : undefined;
};

/**
 * Error-path pending card origin + lane-insertion shifts (same algorithm as
 * committed on-failure layout). Canvas applies `shifts` so the placeholder
 * never overlaps and nothing jumps on confirm.
 */
export const computePendingErrorBranchPlacement = (
  stepId: string,
  nodes: readonly Node[],
  direction: LayoutDirection
): ErrorBranchPlacementResult | undefined => {
  const bounds = absoluteBoundsOf(stepId, nodes);
  if (!bounds) return undefined;

  const obstacleNodes = nodes.filter((n) => n.id !== stepId);
  const obstacles: Array<{ x: number; y: number; width: number; height: number }> = [];
  const obstacleIds: string[] = [];
  for (const n of obstacleNodes) {
    const b = absoluteBoundsOf(n.id, nodes);
    if (!b) continue;
    obstacles.push({
      x: b.minX,
      y: b.minY,
      width: b.maxX - b.minX,
      height: b.maxY - b.minY,
    });
    obstacleIds.push(n.id);
  }

  return resolveErrorBranchPlacement({
    owner: bounds,
    fallbackSize: { width: PENDING_NODE_WIDTH, height: PENDING_NODE_HEIGHT },
    obstacles,
    direction,
    obstacleIds,
  });
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

  if (context.mode === 'error') {
    return computePendingErrorBranchPlacement(context.stepId, nodes, direction)?.origin;
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

  const { index } = context;
  const topLevel = insertionPoints.topLevelStepNodeIds;
  const triggers = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);

  const previousId =
    index > 0
      ? topLevel[index - 1]
      : triggers.length > 0
      ? triggers[triggers.length - 1]
      : undefined;
  const nextId = index < topLevel.length ? topLevel[index] : undefined;

  const previous = previousId ? absoluteBoundsOf(previousId, nodes) : undefined;
  const next = nextId ? absoluteBoundsOf(nextId, nodes) : undefined;

  if (previous && next) {
    // Sit in the gap between the two neighbors.
    if (isHorizontal) {
      const midX = (previous.maxX + next.minX) / 2 - PENDING_NODE_WIDTH / 2;
      const midY = (previous.minY + previous.maxY) / 2 - PENDING_NODE_HEIGHT / 2;
      return { x: midX, y: midY };
    }
    const midX = (previous.minX + previous.maxX) / 2 - PENDING_NODE_WIDTH / 2;
    const midY = (previous.maxY + next.minY) / 2 - PENDING_NODE_HEIGHT / 2;
    return { x: midX, y: midY };
  }

  if (previous) {
    return isHorizontal
      ? {
          x: previous.maxX + PENDING_NODE_GAP,
          y: (previous.minY + previous.maxY) / 2 - PENDING_NODE_HEIGHT / 2,
        }
      : {
          x: (previous.minX + previous.maxX) / 2 - PENDING_NODE_WIDTH / 2,
          y: previous.maxY + PENDING_NODE_GAP,
        };
  }

  // Empty steps: hang the card under / after the trigger row.
  if (triggers.length > 0) {
    const first = absoluteBoundsOf(triggers[0], nodes);
    if (first) {
      return isHorizontal
        ? {
            x: first.maxX + PENDING_NODE_GAP,
            y: (first.minY + first.maxY) / 2 - PENDING_NODE_HEIGHT / 2,
          }
        : {
            x: (first.minX + first.maxX) / 2 - PENDING_NODE_WIDTH / 2,
            y: first.maxY + PENDING_NODE_GAP,
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
