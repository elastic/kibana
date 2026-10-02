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
import { FORK_BUS_LABEL_OFFSET, FORK_BUS_TRUNK, MERGE_BUS_TRUNK } from './compute_edge_path';
import type { InsertionPoints, NodePortTargets } from './compute_insertion_points';
import { stepSupportsErrorHandling } from './step_supports_error_handling';
import type { WorkflowGraphInsertionContext } from './workflow_graph_actions_context';
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
export function absoluteNodeBounds(node: Node, byId: ReadonlyMap<string, Node>): AbsBounds {
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
export function segmentMidpoint(start: WireSegmentPoint, end: WireSegmentPoint): WireSegmentPoint {
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
    branchType === 'parallel' ||
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
  /** Fork-node-id → join-node-id map from the transform. When provided, join-source
   * edges use the fork step's insertion context and join-node terminals position
   * from the join node's exit rather than the raw fork-branch floor. */
  readonly forkNodeToJoinId?: ReadonlyMap<string, string>;
}): readonly WireInsertionControl[] {
  const { nodes, edges, insertionPoints, direction, forkNodeToJoinId } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const controls: WireInsertionControl[] = [];
  /** Keys `${sourceId}:${handle}` that already have a wire control. */
  const wiredExits = new Set<string>();

  // Reverse of forkNodeToJoinId: join-node-id → fork-node-id.
  const joinToForkId: ReadonlyMap<string, string> = forkNodeToJoinId
    ? new Map([...forkNodeToJoinId].map(([forkId, joinId]) => [joinId, forkId]))
    : new Map();

  // Pre-compute which targets receive fan-in exclusively from trigger nodes.
  // These collapse to a single wire control (on the trunk below the bus) instead
  // of one branch-tail terminal per trigger.
  const triggerFanInTargets = new Set<string>();
  {
    const mergeSourcesByTarget = new Map<string, string[]>();
    for (const edge of edges) {
      if (isMergeEdge(edge)) {
        const existing = mergeSourcesByTarget.get(edge.target);
        if (existing) {
          existing.push(edge.source);
        } else {
          mergeSourcesByTarget.set(edge.target, [edge.source]);
        }
      }
    }
    for (const [targetId, sources] of mergeSourcesByTarget) {
      if (sources.length > 1 && sources.every((sid) => byId.get(sid)?.type === 'trigger')) {
        triggerFanInTargets.add(targetId);
      }
    }
  }
  // Tracks max bus-exit position (in the main axis) per trigger fan-in target during the edge loop.
  const triggerFanInBus = new Map<
    string,
    { busPos: number; entry: WireSegmentPoint; insertContext: WorkflowGraphInsertionContext }
  >();

  for (const edge of edges) {
    if (isFailureEdge(edge)) continue;

    // Join-node sources: the edge join → next-step uses the fork node's "after" context.
    const joinedForkId = joinToForkId.get(edge.source);
    if (joinedForkId) {
      const forkPorts = insertionPoints.byNodeId.get(joinedForkId);
      // Fork nodes always have a step port now (compute_insertion_points.ts).
      // Derive the context from either the step port or by node ref lookup.
      const forkStepName = forkPorts?.step?.stepName;
      if (forkStepName) {
        const ctx: WorkflowGraphInsertionContext = { mode: 'after', stepName: forkStepName };
        wiredExits.add(`${edge.source}:step`);
        const srcNode = byId.get(edge.source);
        const tgtNode = byId.get(edge.target);
        if (srcNode && tgtNode) {
          const srcBounds = absoluteNodeBounds(srcNode, byId);
          const tgtBounds = absoluteNodeBounds(tgtNode, byId);
          const s = exitPoint(srcBounds, direction);
          const e = entryPoint(tgtBounds, direction);
          controls.push({
            id: `wire:${edge.id}`,
            kind: 'wire',
            centre: segmentMidpoint(s, e),
            segmentStart: s,
            segmentEnd: e,
            insertContext: ctx,
            fallbackStepName: fallbackStepNameFor(forkPorts ?? {}, srcNode),
            direction,
          });
        }
      }
    } else {
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
            : typeof edgeData?.branchIndex === 'number'
            ? `case:${edgeData.branchIndex}`
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
      const fork = !merge && isForkEdge(edge);

      if (fork) {
        // Fork branch head "+" sits below the chip label (always visible, like a terminal).
        // Chip is at FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET below the source exit.
        const chipOffset = FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET;
        // "+" centre must clear the chip AND the button itself with visible breathing room:
        // chip half-height (11px incl 1px border) + button half-height (11px from CONTROL_SIZE=22) + 14px gap = 36px.
        const CHIP_PLUS_GAP = 36;
        const chipX = direction === 'LR' ? start.x + chipOffset : end.x;
        const chipY = direction === 'LR' ? end.y : start.y + chipOffset;
        const plusX = chipX;
        const plusY = direction === 'LR' ? chipY : chipY + CHIP_PLUS_GAP;
        const plusPos = { x: plusX, y: plusY };
        // Use position:'start' so clicking this "+" prepends to the branch.
        const headContext: WorkflowGraphInsertionContext =
          insertContext.mode === 'branch' ? { ...insertContext, position: 'start' } : insertContext;
        // Arrow stub starts at chip bottom (chipY + chip half-height incl 1px border), not chip centre,
        // so the dashed line doesn't overlap the chip label.
        const chipBottomY = direction === 'LR' ? chipY : chipY + 11;
        controls.push({
          id: `terminal:fork:${edge.id}`,
          kind: 'terminal',
          centre: plusPos,
          segmentStart: { x: chipX, y: chipBottomY },
          segmentEnd: plusPos,
          insertContext: headContext,
          fallbackStepName: fallbackStepNameFor(ports, sourceNode),
          direction,
        });
      } else if (merge) {
        // Merge (fan-in) edges.
        if (triggerFanInTargets.has(edge.target)) {
          // All sources are triggers: collapse to one wire control on the trunk below
          // the bus. Track the lowest (highest Y for TB) trigger exit during this loop;
          // emit the single control after the loop completes.
          const busPos = direction === 'LR' ? start.x : start.y;
          const existing = triggerFanInBus.get(edge.target);
          if (!existing || busPos > existing.busPos) {
            triggerFanInBus.set(edge.target, { busPos, entry: end, insertContext });
          }
        } else if (insertContext.mode === 'after' || insertContext.mode === 'prepend-step') {
          // Non-trigger fan-in: emit a branch-tail terminal just below the branch's
          // last step (the source of this merge edge). One per non-bypass fan-in edge —
          // bypass nodes have no insertion ports so they're filtered out naturally.
          // Always visible (kind: 'terminal'). Context: `after <leaf step>`.
          const tip = terminalTip(start, direction);
          controls.push({
            id: `terminal:branch-tail:${edge.id}`,
            kind: 'terminal',
            centre: tip,
            segmentStart: start,
            segmentEnd: tip,
            insertContext,
            fallbackStepName: fallbackStepNameFor(ports, sourceNode),
            direction,
          });
        }
      } else {
        // Plain sequential edge: midpoint of the full source→target segment.
        const centre = segmentMidpoint(start, end);
        controls.push({
          id: `wire:${edge.id}`,
          kind: 'wire',
          centre,
          segmentStart: start,
          segmentEnd: end,
          insertContext,
          // on-failure is a property of the upstream step, not the edge.
          fallbackStepName: fallbackStepNameFor(ports, sourceNode),
          direction,
        });
      }
    }
  }

  // Emit single wire controls for trigger fan-in targets (one per multi-trigger fan-in).
  // Positioned on the trunk segment from the bus (bottom of triggers) to the first step.
  for (const [targetId, { busPos, entry, insertContext }] of triggerFanInBus) {
    const busPoint: WireSegmentPoint =
      direction === 'LR' ? { x: busPos, y: entry.y } : { x: entry.x, y: busPos };
    controls.push({
      id: `wire:trigger-fanin:${targetId}`,
      kind: 'wire',
      centre: segmentMidpoint(busPoint, entry),
      segmentStart: busPoint,
      segmentEnd: entry,
      insertContext,
      fallbackStepName: undefined,
      direction,
    });
  }

  // Pre-compute the branch floor for each fork node (max exit of branch targets).
  // Used to position the "after block" terminal below all branch exits.
  const forkBranchFloor = new Map<string, number>();
  for (const edge of edges) {
    if (!isForkEdge(edge) || isMergeEdge(edge)) continue;
    const tgt = byId.get(edge.target);
    if (!tgt) continue;
    const tgtBounds = absoluteNodeBounds(tgt, byId);
    const tgtFloor =
      direction === 'LR' ? tgtBounds.x + tgtBounds.width : tgtBounds.y + tgtBounds.height;
    const current = forkBranchFloor.get(edge.source) ?? -Infinity;
    forkBranchFloor.set(edge.source, Math.max(current, tgtFloor));
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
      insertContext: WorkflowGraphInsertionContext,
      effectiveStart?: WireSegmentPoint
    ): void => {
      if (wiredExits.has(`${nodeId}:${handleKey}`)) return;
      const segStart = effectiveStart ?? start;
      const tip = terminalTip(segStart, direction);
      controls.push({
        id: `terminal:${nodeId}:${handleKey}`,
        kind: 'terminal',
        // Dashed + sits at the tip of the half-height stub arrow.
        centre: tip,
        segmentStart: segStart,
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
      const joinNodeId = forkNodeToJoinId?.get(nodeId);
      if (joinNodeId) {
        // Fork node with a virtual join node: terminal starts at the join-node
        // exit (below the merge bus) when the join node itself is terminal.
        // When join → next-step is wired, the wire control from the join-source
        // path above already handles insertion; skip the terminal here.
        if (!wiredExits.has(`${joinNodeId}:step`)) {
          const joinNode = byId.get(joinNodeId);
          if (joinNode) {
            const joinBounds = absoluteNodeBounds(joinNode, byId);
            const joinExit = exitPoint(joinBounds, direction);
            maybeTerminal('step', ctx, joinExit);
          }
        }
      } else {
        // Regular step or fork node without a join node (e.g. parallel with 0 branches):
        // fall back to the branch-floor positioning.
        const branchFloor = forkBranchFloor.get(nodeId);
        const forkStart =
          branchFloor != null
            ? direction === 'LR'
              ? { x: branchFloor + MERGE_BUS_TRUNK, y: start.y }
              : { x: start.x, y: branchFloor + MERGE_BUS_TRUNK }
            : undefined;
        maybeTerminal('step', ctx, forkStart);
      }
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
