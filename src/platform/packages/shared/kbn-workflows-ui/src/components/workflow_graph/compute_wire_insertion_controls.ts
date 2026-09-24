/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import type { EdgeBranchType, LayoutDirection } from '@kbn/workflows';
import { MERGE_BUS_TRUNK, TRUNK_LENGTH_TO_TARGET } from './compute_edge_path';
import type { InsertionPoints, NodePortTargets, StepPortTarget } from './compute_insertion_points';
import { errorHalfEligible } from './error_half_eligibility';
import { WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

/**
 * Stub length from the last node's exit edge to the terminal + tip.
 * Half a normal inter-rank arrow so the end control reads as attached, not floating.
 */
export const TERMINAL_STUB_PX = Math.round(WORKFLOW_RANK_SEP / 2);

export type WireControlKind = 'wire' | 'terminal';

export interface WireSegmentPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * One Add-step insertion control. Mid-wire centres use the segment midpoint;
 * terminals sit at the stub tip (end of the half-height arrow).
 */
export interface WireInsertionControl {
  readonly id: string;
  readonly kind: WireControlKind;
  /** Control centre in flow-space (midpoint for wires; stub tip for terminals). */
  readonly centre: WireSegmentPoint;
  /** Segment start (source exit) — for stub wire rendering on terminals. */
  readonly segmentStart: WireSegmentPoint;
  /** Segment end (target entry or terminal stub tip). */
  readonly segmentEnd: WireSegmentPoint;
  /** Insert into the sequence at this splice target (Add step). */
  readonly stepTarget: StepPortTarget;
  /**
   * Upstream step id when an error path would be eligible. Failure insertion
   * lives on the node edge — this is retained for Show-me / eligibility checks
   * that still key off the wire's upstream node.
   */
  readonly errorStepId?: string;
  /** Layout axis. */
  readonly direction: LayoutDirection;
}

interface AbsBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Absolute (flow-space) bounds; walks parentId chain for nested nodes. */
export function absoluteNodeBounds(
  node: Node,
  byId: ReadonlyMap<string, Node>
): AbsBounds {
  let { x, y } = node.position;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  const width = typeof node.width === 'number' ? node.width : 0;
  const height = typeof node.height === 'number' ? node.height : 0;
  return { x, y, width, height };
}

/** Midpoint of a segment — the rule every control position must use. */
export function segmentMidpoint(
  start: WireSegmentPoint,
  end: WireSegmentPoint
): WireSegmentPoint {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

/**
 * Straight lead-in into the target handle — the post-curve stub used by fork
 * drops and the shared merge trunk. Controls sit on this segment so the +
 * lands on the drawn line rather than in empty space between nodes.
 */
export function approachTrunkSegment(
  entry: WireSegmentPoint,
  direction: LayoutDirection,
  length: number
): { readonly start: WireSegmentPoint; readonly end: WireSegmentPoint } {
  if (direction === 'LR') {
    return { start: { x: entry.x - length, y: entry.y }, end: entry };
  }
  return { start: { x: entry.x, y: entry.y - length }, end: entry };
}

const exitPoint = (bounds: AbsBounds, direction: LayoutDirection): WireSegmentPoint =>
  direction === 'LR'
    ? { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
    : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };

const entryPoint = (bounds: AbsBounds, direction: LayoutDirection): WireSegmentPoint =>
  direction === 'LR'
    ? { x: bounds.x, y: bounds.y + bounds.height / 2 }
    : { x: bounds.x + bounds.width / 2, y: bounds.y };

const terminalTip = (exit: WireSegmentPoint, direction: LayoutDirection): WireSegmentPoint =>
  direction === 'LR'
    ? { x: exit.x + TERMINAL_STUB_PX, y: exit.y }
    : { x: exit.x, y: exit.y + TERMINAL_STUB_PX };

const resolveStepTarget = (
  ports: NodePortTargets,
  sourceHandle: string | null | undefined
): StepPortTarget | undefined => {
  if (sourceHandle === 'then') return ports.then;
  if (sourceHandle === 'else') return ports.else;
  return ports.step;
};

const isFailureEdge = (edge: Edge): boolean => {
  const data = edge.data as { isFailure?: boolean } | undefined;
  return data?.isFailure === true;
};

const isMergeEdge = (edge: Edge): boolean => {
  const data = edge.data as { isMerge?: boolean } | undefined;
  return data?.isMerge === true;
};

const isForkEdge = (edge: Edge): boolean => {
  const data = edge.data as { branchType?: EdgeBranchType } | undefined;
  const branchType = data?.branchType;
  return branchType === 'switch' || branchType === 'then' || branchType === 'else';
};

const stepTypeOf = (node: Node | undefined): string | undefined => {
  if (!node || typeof node.data !== 'object' || node.data === null) return undefined;
  if (!('stepType' in node.data)) return undefined;
  const value = (node.data as { stepType?: unknown }).stepType;
  return typeof value === 'string' ? value : undefined;
};

const errorStepIdFor = (
  ports: NodePortTargets,
  sourceNode: Node | undefined
): string | undefined => {
  const eligible = errorHalfEligible({
    isTrigger: sourceNode?.type === 'trigger',
    stepType: stepTypeOf(sourceNode),
    hasFallback: ports.errorConnected === true,
  });
  return eligible ? ports.errorStepId : undefined;
};

/**
 * Derives wire + terminal split controls from laid-out nodes/edges and the
 * existing insertion-point map. Pure: safe to memoize.
 *
 * Never places both a wire control and a terminal on the same gap.
 * Fork/merge edges anchor the control on the post-curve approach trunk so the
 * + sits on the drawn line; fan-in merges share one control per target.
 */
export function computeWireInsertionControls(args: {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly insertionPoints: InsertionPoints;
  readonly direction: LayoutDirection;
}): readonly WireInsertionControl[] {
  const { nodes, edges, insertionPoints, direction } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const controls: WireInsertionControl[] = [];
  /** Keys `${sourceId}:${handle}` that already have a wire control. */
  const wiredExits = new Set<string>();
  /** Merge targets that already have a shared-trunk control. */
  const mergeTargetsSeen = new Set<string>();

  for (const edge of edges) {
    if (isFailureEdge(edge)) continue;
    const ports = insertionPoints.byNodeId.get(edge.source);
    if (!ports) continue;
    const stepTarget = resolveStepTarget(ports, edge.sourceHandle);
    if (!stepTarget) continue;

    const sourceNode = byId.get(edge.source);
    const targetNode = byId.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceBounds = absoluteNodeBounds(sourceNode, byId);
    const targetBounds = absoluteNodeBounds(targetNode, byId);
    const start = exitPoint(sourceBounds, direction);
    const end = entryPoint(targetBounds, direction);

    const handleKey = edge.sourceHandle ?? 'step';
    wiredExits.add(`${edge.source}:${handleKey}`);

    const merge = isMergeEdge(edge);
    if (merge && mergeTargetsSeen.has(edge.target)) {
      // Shared lower trunk already has a control from an earlier fan-in edge.
      continue;
    }
    if (merge) mergeTargetsSeen.add(edge.target);

    // Fork drops and merge trunks: sit on the post-curve approach stub.
    // Plain sequential edges: midpoint of the full source→target segment.
    const useApproachTrunk = merge || isForkEdge(edge);
    const trunkLength = merge ? MERGE_BUS_TRUNK : TRUNK_LENGTH_TO_TARGET;
    const segment = useApproachTrunk
      ? approachTrunkSegment(end, direction, trunkLength)
      : { start, end };
    const centre = segmentMidpoint(segment.start, segment.end);

    controls.push({
      id: merge ? `wire:merge:${edge.target}` : `wire:${edge.id}`,
      kind: 'wire',
      centre,
      segmentStart: segment.start,
      segmentEnd: segment.end,
      stepTarget,
      // on-failure is a property of the upstream step, not the edge.
      errorStepId: errorStepIdFor(ports, sourceNode),
      direction,
    });
  }

  // Terminals: step / then / else exits that have no outgoing non-failure wire.
  for (const [nodeId, ports] of insertionPoints.byNodeId) {
    const sourceNode = byId.get(nodeId);
    if (!sourceNode) continue;
    const sourceBounds = absoluteNodeBounds(sourceNode, byId);
    const start = exitPoint(sourceBounds, direction);
    const errorStepId = errorStepIdFor(ports, sourceNode);

    const maybeTerminal = (
      handleKey: string,
      stepTarget: StepPortTarget | undefined
    ): void => {
      if (!stepTarget) return;
      if (wiredExits.has(`${nodeId}:${handleKey}`)) return;
      const tip = terminalTip(start, direction);
      controls.push({
        id: `terminal:${nodeId}:${handleKey}`,
        kind: 'terminal',
        // Dashed + sits at the tip of the half-height stub arrow.
        centre: tip,
        segmentStart: start,
        segmentEnd: tip,
        stepTarget,
        errorStepId,
        direction,
      });
    };

    maybeTerminal('step', ports.step);
    maybeTerminal('then', ports.then);
    maybeTerminal('else', ports.else);
  }

  return controls;
}
