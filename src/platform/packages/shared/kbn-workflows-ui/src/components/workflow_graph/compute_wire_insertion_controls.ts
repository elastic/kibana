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
import type { InsertionPoints, NodePortTargets } from './compute_insertion_points';
import type { WorkflowGraphInsertionContext } from './workflow_graph_actions_context';
import { stepSupportsErrorHandling } from './step_supports_error_handling';
/**
 * Stub length from the last node's exit edge to the terminal + tip.
 * Longer than inter-rank spacing so the terminal insert control is visually
 * distinct from mid-wire controls and the + tip doesn't crowd the node.
 */
export const TERMINAL_STUB_PX = 75;

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
  /** Fully-resolved insertion context — passed directly to `edit.onInsert`. */
  readonly insertContext: WorkflowGraphInsertionContext;
  /**
   * Step name eligible for fallback insertion on this wire's upstream node.
   * Undefined when the upstream step already has fallback steps or doesn't
   * support error handling. Used for Show-me / node-menu eligibility hints.
   */
  readonly fallbackStepName?: string;
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

const resolveInsertContext = (
  ports: NodePortTargets,
  sourceHandle: string | null | undefined
): WorkflowGraphInsertionContext | undefined => {
  const handle = sourceHandle ?? 'step';

  // Named branch handle (then/else for if-nodes; branch:N, case:X, default for others).
  // 'then' maps to slot.kind === 'steps' (keyed 'steps' in the branches map).
  const branchKey = handle === 'then' ? 'steps' : handle;
  if (handle !== 'step' && handle !== 'fallback') {
    const branchEntry = ports.branches?.get(branchKey);
    if (branchEntry) {
      return { mode: 'branch', stepName: branchEntry.ownerStepName, branch: branchEntry.slot };
    }
  }

  // Flow (step) port.
  if (!ports.step) return undefined;
  if (!ports.step.stepName) {
    // Trigger node: insert as the first workflow step.
    return { mode: 'prepend-step' };
  }
  return { mode: 'after', stepName: ports.step.stepName };
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
  const data = edge.data as { branchType?: EdgeBranchType; branchIndex?: number } | undefined;
  const branchType = data?.branchType;
  return (
    branchType === 'switch' ||
    branchType === 'then' ||
    branchType === 'else' ||
    typeof data?.branchIndex === 'number'
  );
};

const stepTypeOf = (node: Node | undefined): string | undefined => {
  if (!node || typeof node.data !== 'object' || node.data === null) return undefined;
  if (!('stepType' in node.data)) return undefined;
  const value = (node.data as { stepType?: unknown }).stepType;
  return typeof value === 'string' ? value : undefined;
};

const fallbackStepNameFor = (
  ports: NodePortTargets,
  sourceNode: Node | undefined
): string | undefined => {
  // Eligible when the step supports error-handling and doesn't already have one.
  const eligible =
    sourceNode?.type !== 'trigger' &&
    stepSupportsErrorHandling(stepTypeOf(sourceNode)) &&
    !ports.fallbackConnected;
  return eligible ? ports.fallbackTarget?.stepName : undefined;
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
    // For switch/parallel branch edges the React Flow sourceHandle is not set
    // to the case/branch key (nodes don't mount a named handle per case/branch).
    // Derive the logical branch key from edge data so insertionPoints can be
    // looked up correctly, independently of the rendered handle.
    const edgeData = edge.data as
      | { branchType?: EdgeBranchType; branchIndex?: number; label?: string }
      | undefined;
    const handleKey =
      edgeData?.branchType === 'switch'
        ? edgeData.label === 'default'
          ? 'default'
          : `case:${edgeData.label}`
        : typeof edgeData?.branchIndex === 'number'
        ? `branch:${edgeData.branchIndex}`
        : edge.sourceHandle ?? 'step';

    const insertContext = resolveInsertContext(ports, handleKey);
    if (!insertContext) continue;

    const sourceNode = byId.get(edge.source);
    const targetNode = byId.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceBounds = absoluteNodeBounds(sourceNode, byId);
    const targetBounds = absoluteNodeBounds(targetNode, byId);
    const start = exitPoint(sourceBounds, direction);
    const end = entryPoint(targetBounds, direction);

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
      insertContext,
      // on-failure is a property of the upstream step, not the edge.
      fallbackStepName: fallbackStepNameFor(ports, sourceNode),
      direction,
    });
  }

  // Terminals: step / branch exits that have no outgoing non-failure wire.
  for (const [nodeId, ports] of insertionPoints.byNodeId) {
    const sourceNode = byId.get(nodeId);
    if (!sourceNode) continue;
    const sourceBounds = absoluteNodeBounds(sourceNode, byId);
    const start = exitPoint(sourceBounds, direction);
    const fallbackStepName = fallbackStepNameFor(ports, sourceNode);

    const maybeTerminal = (
      handleKey: string,
      insertContext: WorkflowGraphInsertionContext
    ): void => {
      if (wiredExits.has(`${nodeId}:${handleKey}`)) return;
      const tip = terminalTip(start, direction);
      controls.push({
        id: `terminal:${nodeId}:${handleKey}`,
        kind: 'terminal',
        // Dashed + sits at the tip of the half-height stub arrow.
        centre: tip,
        segmentStart: start,
        segmentEnd: tip,
        insertContext,
        fallbackStepName,
        direction,
      });
    };

    if (ports.step) {
      const ctx: WorkflowGraphInsertionContext = ports.step.stepName
        ? { mode: 'after', stepName: ports.step.stepName }
        : { mode: 'prepend-step' };
      maybeTerminal('step', ctx);
    }

    if (ports.branches) {
      for (const [branchKey, branchEntry] of ports.branches) {
        // 'steps' is the if-node "then" branch — handle ID is 'then'.
        const handleKey = branchKey === 'steps' ? 'then' : branchKey;
        const ctx: WorkflowGraphInsertionContext = {
          mode: 'branch',
          stepName: branchEntry.ownerStepName,
          branch: branchEntry.slot,
        };
        maybeTerminal(handleKey, ctx);
      }
    }
  }

  return controls;
}
