/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IdAllocator } from './id_allocator';
import type {
  FallbackLane,
  ForeachGroup,
  GraphEdge,
  LayoutStructure,
  NodeRef,
  PreLayoutBypassLaneNode,
  PreLayoutForeachGroupNode,
  PreLayoutNode,
  PreLayoutStepNode,
  PreLayoutTriggerNode,
  Step,
  StructureBranch,
  StructureItem,
  StructureLane,
  StructureSequence,
} from './types';
import {
  CONTAINER_STEP_TYPES,
  DEFAULT_NODE_STYLE,
  FOREACH_GROUP_EMPTY_HEIGHT,
  isStep,
} from './types';
import { visitStepChildSlots } from './walk_step_tree';
import { getTriggerName } from '../common/get_trigger_name';
import type { IfStep, MergeStep, ParallelStep, SwitchStep, WorkflowYaml } from '../spec/schema';

/** Height of every layout-only bypass and join node. */
const BYPASS_LANE_HEIGHT = 1;
/** Width of a bypass or join node that only needs to hold a lane open for dagre. */
const BYPASS_LANE_THIN_WIDTH = 1;
/**
 * Width of a bypass or join node that React Flow must be able to measure.
 * Width 80 keeps updateNodeInternals from measuring offsetWidth=0, which would
 * leave the node without handle bounds.
 */
const BYPASS_LANE_MEASURABLE_WIDTH = 80;

/** Keeps only well-formed steps, like `visitStepChildSlots` does for the fingerprint. */
const toSteps = (value: unknown): Step[] => (Array.isArray(value) ? value.filter(isStep) : []);

/** Resolves the label drawn on a trigger node. Defaults to {@link getTriggerName}. */
export type GetTriggerLabel = (triggerType: string) => string;

const defaultGetTriggerLabel: GetTriggerLabel = (triggerType) => getTriggerName(triggerType);

/** Collapse duplicate exit ids when empty branches fall through via the same gate. */
function dedupeIds(ids: string[]): string[] {
  return ids.length <= 1 ? ids : [...new Set(ids)];
}

export interface TransformResult {
  nodes: PreLayoutNode[];
  edges: GraphEdge[];
  foreachGroups: ForeachGroup[];
  /**
   * Layout-only bypass lane nodes for unbalanced `if`/`switch` branches and
   * virtual join nodes for fork blocks. Separate from domain `nodes` — callers
   * pass these to the layout engine but must not render them as workflow steps
   * or include them in `nodeRefs`.
   */
  bypassLaneNodes: PreLayoutBypassLaneNode[];
  /**
   * Maps every node id to its source in the workflow definition.
   * The transform is the single place that mints node ids (via `IdAllocator`),
   * so it is the authoritative owner of this mapping — callers must not
   * reconstruct it by reading `node.data`.
   */
  nodeRefs: Record<string, NodeRef>;
  /**
   * One entry per `on-failure.fallback` lane in the graph. The renderer uses
   * this to build owner/head/leaf sets for execution highlighting and to widen
   * the `mergeNodeIds` predicate so shape-2 rejoin edges route correctly.
   */
  fallbackLanes: FallbackLane[];
  /**
   * Maps each fork node id (if/switch/parallel) to its virtual join node id.
   * The join node is an invisible bypass-lane node that all branch exits
   * connect to, giving the merge bus a shared render target. When no steps
   * follow the fork block the join node is the terminal exit; when a step
   * follows, the join node connects to it via a single outgoing edge.
   */
  forkNodeToJoinId: ReadonlyMap<string, string>;
  /**
   * The workflow's block structure (forks, branches, containers, fallback lanes) in
   * declaration order. The layout packs cross-axis positions from this tree.
   */
  structure: LayoutStructure;
}

interface InternalTransformResult extends Omit<TransformResult, 'structure'> {
  leafIds: string[];
  /** Id of the first step transformed at this level, or `undefined` when there are no steps. */
  headId: string | undefined;
  /** The structure items of the steps transformed at this level, in order. */
  items: StructureSequence;
  /**
   * Failure edges collected by this level's transform. Kept separate from
   * `edges` so callers can forward them to their own `failureEdges` bucket
   * rather than splicing them mid-list. Only the two graph-level boundaries
   * concatenate: `transformWorkflowToGraph` (outer graph) and the
   * `foreachGroups` push (group body, which is its own graph).
   */
  failureEdges: GraphEdge[];
  /** Mutable local map — typed separately so inner merges can call `.set()`. */
  forkNodeToJoinId: Map<string, string>;
}

/**
 * Transforms the parsed `WorkflowYaml` into a flat list of pre-layout nodes
 * and edges plus an optional list of `foreachGroup` containers (top-level
 * foreach steps render their body inside a visual container).
 *
 * Pure for a given `getTriggerLabel`: same workflow and label function → same output.
 * Safe to memoize on the topology fingerprint. Without `getTriggerLabel`, names come
 * from {@link getTriggerName}: Manual, Alert, and Scheduled, then the type id.
 */
export function transformWorkflowToGraph(
  workflow: WorkflowYaml | undefined,
  getTriggerLabel: GetTriggerLabel = defaultGetTriggerLabel
): TransformResult {
  if (!workflow)
    return {
      nodes: [],
      edges: [],
      foreachGroups: [],
      bypassLaneNodes: [],
      nodeRefs: {},
      fallbackLanes: [],
      forkNodeToJoinId: new Map(),
      structure: { triggers: [], items: [] },
    };

  const ids = new IdAllocator();
  const {
    nodes,
    edges,
    failureEdges,
    foreachGroups,
    bypassLaneNodes,
    nodeRefs,
    fallbackLanes,
    forkNodeToJoinId,
    items,
  } = transformInternal(
    workflow.triggers ?? [],
    toSteps(workflow.steps),
    ids,
    { fallbackDepth: 0 },
    getTriggerLabel
  );
  // Boundary 1: concatenate all failure edges after all structural edges so
  // the outer graph's edge list keeps [structural, failure] order (plan step 6).
  return {
    nodes,
    edges: [...edges, ...failureEdges],
    foreachGroups,
    bypassLaneNodes,
    nodeRefs,
    fallbackLanes,
    forkNodeToJoinId,
    structure: {
      triggers: nodes.filter((node) => node.type === 'trigger').map((node) => node.id),
      items,
    },
  };
}

interface LevelContext {
  /** The `foreachGroup` node id whose dagre sub-graph we are inside, or `undefined` for the root graph. */
  readonly graphId?: string;
  /** Number of `on-failure.fallback` boundaries crossed within `graphId`. Resets to 0 at each graph boundary. */
  readonly fallbackDepth: number;
}

function transformInternal(
  triggers: WorkflowYaml['triggers'],
  steps: Step[],
  ids: IdAllocator,
  ctx: LevelContext,
  // Nested calls pass no triggers, so they keep the default. The root call
  // passes the caller's function, which is what labels the trigger nodes.
  getTriggerLabel: GetTriggerLabel = defaultGetTriggerLabel
): InternalTransformResult {
  const nodes: PreLayoutNode[] = [];
  const bypassLaneNodes: PreLayoutBypassLaneNode[] = [];
  const edges: GraphEdge[] = [];
  // Failure edges are collected here and appended to `edges` at the end of the
  // loop so they land after all spine and branch edges (Decision 8). This makes
  // dagre see [spine, fallback] declaration order, keeping the fallback lane on
  // the +cross side without any post-dagre side-correction pass.
  const failureEdges: GraphEdge[] = [];
  const foreachGroups: ForeachGroup[] = [];
  const fallbackLanes: FallbackLane[] = [];
  const nodeRefs: Record<string, NodeRef> = {};
  const forkNodeToJoinId: Map<string, string> = new Map();
  const items: StructureItem[] = [];

  /** Adds a bypass lane node and the labelled edge from `gateId` to it for a branch without steps. */
  const emitBypassBranch = (
    gateId: string,
    bypassName: string,
    edgeSuffix: string,
    edge: Pick<GraphEdge, 'branchType' | 'branchIndex' | 'label'>,
    width: number = BYPASS_LANE_MEASURABLE_WIDTH
  ): string => {
    const bypassId = ids.allocate(bypassName);
    bypassLaneNodes.push({ id: bypassId, style: { width, height: BYPASS_LANE_HEIGHT } });
    edges.push({
      id: `${gateId}:${bypassId}-${edgeSuffix}`,
      source: gateId,
      target: bypassId,
      ...edge,
    });
    return bypassId;
  };

  /** Adds the virtual join node every exit of a fork block connects to, and records it for `gateId`. */
  const emitJoin = (gateId: string, gateName: string, exits: string[], width: number): string => {
    const joinNodeId = ids.allocate(`${gateName}-join`);
    bypassLaneNodes.push({ id: joinNodeId, style: { width, height: BYPASS_LANE_HEIGHT } });
    for (const exitId of dedupeIds(exits)) {
      edges.push({ id: `${exitId}:${joinNodeId}`, source: exitId, target: joinNodeId });
    }
    forkNodeToJoinId.set(gateId, joinNodeId);
    return joinNodeId;
  };

  /** Folds the result of a nested `transformInternal` call into this level's accumulators. */
  const mergeInner = (inner: InternalTransformResult): void => {
    Object.assign(nodeRefs, inner.nodeRefs);
    for (const [k, v] of inner.forkNodeToJoinId) forkNodeToJoinId.set(k, v);
    nodes.push(...inner.nodes);
    bypassLaneNodes.push(...inner.bypassLaneNodes);
    edges.push(...inner.edges);
    failureEdges.push(...inner.failureEdges);
    foreachGroups.push(...inner.foreachGroups);
    fallbackLanes.push(...inner.fallbackLanes);
  };

  const triggerIds: string[] = [];
  let triggerIndex = 0;
  for (const trigger of triggers) {
    const id = ids.allocate(trigger.type);
    triggerIds.push(id);
    nodeRefs[id] = { kind: 'trigger', triggerIndex, triggerType: trigger.type };
    triggerIndex += 1;
    const triggerNode: PreLayoutTriggerNode = {
      id,
      type: 'trigger',
      data: {
        stepType: trigger.type,
        label: getTriggerLabel(trigger.type),
        isTrigger: true,
      },
      style: { ...DEFAULT_NODE_STYLE },
    };
    nodes.push(triggerNode);
  }

  const stepIds = steps.map((step) => ids.allocate(step.name));

  // Tracks the "live" exit ids at the previous step that the *next* step in
  // the sibling sequence should connect from. For regular steps that's the
  // step's own id; for `if`/`parallel` it's the leaves of every branch so
  // sibling-after-the-if joins both branches together.
  let prevExitIds: string[] = [];
  // Tracks which source ids are lane leaves added via `hasContinuePath` so the
  // fan-in loop can tag those edges `isRejoin: true`.
  const rejoinSourceIds = new Set<string>();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const id = stepIds[i];

    // First step gets connected to all triggers
    if (i === 0) {
      for (const triggerId of triggerIds) {
        edges.push({ id: `${triggerId}:${id}`, source: triggerId, target: id });
      }
    } else {
      // Connect from each exit point of the previous sibling.
      const sources = dedupeIds(prevExitIds);
      for (const sourceId of sources) {
        edges.push({
          id: `${sourceId}:${id}`,
          source: sourceId,
          target: id,
          ...(rejoinSourceIds.has(sourceId) ? { isRejoin: true } : {}),
        });
      }
    }

    // Default exit point for this step is itself; control structures override
    // this with the leaves of their branches.
    let exitIds: string[] = [id];
    // Block structure of this step, filled in by the arm that handles its type.
    let containerBody: StructureSequence | undefined;
    let forkBranches: StructureBranch[] | undefined;
    let attached: StructureSequence | undefined;
    let joinId: string | undefined;
    const lanes: StructureLane[] = [];

    // Record the back-pointer from this node id to its source step.  Both
    // `step` and `foreachGroup` node kinds map to the same step name — the
    // foreachGroup container IS that step, just rendered differently.
    nodeRefs[id] = { kind: 'step', stepName: step.name };

    // Container step types (foreach, while) render as a group container node,
    // at any nesting depth. The container is a self-contained "folder": one
    // edge in (from the previous outer step), one edge out (to the next outer
    // step), and inner steps only connect to each other.
    // CONTAINER_STEP_TYPES is the single source of truth for this set.
    const isContainerGroup = CONTAINER_STEP_TYPES.has(step.type);

    if (isContainerGroup) {
      // Render the container as a `foreachGroup` node (full-width header +
      // body). The regular step node would overlap with the inner children.
      // dagLayout preserves the caller-provided height when innerNodes is empty,
      // so use FOREACH_GROUP_EMPTY_HEIGHT (> DEFAULT_NODE_STYLE.height) to make
      // an empty container visually distinct from a regular step node.
      const groupNode: PreLayoutForeachGroupNode = {
        id,
        type: 'foreachGroup',
        data: { label: step.name, stepType: step.type, step },
        style: { ...DEFAULT_NODE_STYLE, height: FOREACH_GROUP_EMPTY_HEIGHT },
      };
      nodes.push(groupNode);

      // Explicitly select the 'steps' slot (not iteration-on-failure.fallback,
      // which visitStepChildSlots also enumerates for foreach/while). Using
      // last-wins over all slots would silently swap the loop body for the
      // fallback body when iteration-on-failure is present.
      let childSteps: Step[] = [];
      visitStepChildSlots(step, (slot, children) => {
        if (slot.kind === 'steps') childSteps = children;
      });
      const inner = transformInternal([], childSteps, ids, { graphId: id, fallbackDepth: 0 });
      containerBody = inner.items;
      Object.assign(nodeRefs, inner.nodeRefs);
      for (const [k, v] of inner.forkNodeToJoinId) forkNodeToJoinId.set(k, v);
      // inner.bypassLaneNodes stay on the group only — do NOT hoist them to the
      // top-level list. The layout pipeline feeds group bypass nodes separately
      // as compound-group children (workflow_layout_pipeline.ts:65). Hoisting
      // would cause a duplicate node id for unbalanced if/switch inside a
      // foreach/while body.
      // Boundary 2: the group body is its own graph; concatenate failure edges
      // last so the body's edge list also keeps [structural, failure] order.
      foreachGroups.push({
        id,
        innerNodes: inner.nodes,
        innerEdges: [...inner.edges, ...inner.failureEdges],
        bypassLaneNodes: inner.bypassLaneNodes,
      });
      foreachGroups.push(...inner.foreachGroups);
      fallbackLanes.push(...inner.fallbackLanes);

      // The group is a self-contained "folder": one edge in (from the
      // previous sibling to the group itself), one edge out (the next sibling
      // joins from the group's id via `exitIds = [id]` below), and the inner
      // steps only connect to each other. Deliberately NOT adding an edge
      // from the group to its first inner step — that line would cross the
      // container boundary and clutter the diagram.
    } else {
      const stepNode: PreLayoutStepNode = {
        id,
        type: 'step',
        data: { label: step.name, stepType: step.type, step },
        style: { ...DEFAULT_NODE_STYLE },
      };
      nodes.push(stepNode);
    }

    if (step.type === 'if') {
      const ifStep = step as IfStep;
      const thenSteps = toSteps(ifStep.steps);
      const elseSteps = toSteps(ifStep.else);

      const hasThen = thenSteps.length > 0;
      const hasElse = elseSteps.length > 0;

      const branchExits: string[] = [];
      const branches: StructureBranch[] = [];

      if (hasThen) {
        const inner = transformInternal([], thenSteps, ids, ctx);
        mergeInner(inner);
        const firstId = inner.headId;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-then`,
            source: id,
            target: firstId,
            branchType: 'then',
            label: 'true',
          });
          branches.push({ head: firstId, items: inner.items, label: 'true' });
        }
        branchExits.push(...inner.leafIds);
      } else if (hasElse) {
        // No `then` body but `else` is present — synthesize a bypass lane node
        // for the true path so dagre allocates a balanced diamond lane.
        const bypassId = emitBypassBranch(
          id,
          `${step.name}-then-bypass`,
          'then',
          { branchType: 'then', label: 'true' },
          BYPASS_LANE_THIN_WIDTH
        );
        branches.push({ head: bypassId, items: [], label: 'true' });
        branchExits.push(bypassId);
      } else {
        // Both branches empty — synthesize bypass nodes for both so labeled
        // dangling edges appear on the canvas.
        const bypassId = emitBypassBranch(id, `${step.name}-then-bypass`, 'then', {
          branchType: 'then',
          label: 'true',
        });
        branches.push({ head: bypassId, items: [], label: 'true' });
        branchExits.push(bypassId);
      }

      if (hasElse) {
        const inner = transformInternal([], elseSteps, ids, ctx);
        mergeInner(inner);
        const firstId = inner.headId;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-else`,
            source: id,
            target: firstId,
            branchType: 'else',
            label: 'false',
          });
          branches.push({ head: firstId, items: inner.items, label: 'false' });
        }
        branchExits.push(...inner.leafIds);
      } else if (hasThen) {
        // No `else` body but `then` is present — synthesize a bypass lane node
        // for the false path so dagre allocates a balanced diamond lane.
        const bypassId = emitBypassBranch(
          id,
          `${step.name}-else-bypass`,
          'else',
          { branchType: 'else', label: 'false' },
          BYPASS_LANE_THIN_WIDTH
        );
        branches.push({ head: bypassId, items: [], label: 'false' });
        branchExits.push(bypassId);
      } else {
        // Both branches empty — synthesize a bypass for the false path too.
        const bypassId = emitBypassBranch(id, `${step.name}-else-bypass`, 'else', {
          branchType: 'else',
          label: 'false',
        });
        branches.push({ head: bypassId, items: [], label: 'false' });
        branchExits.push(bypassId);
      }

      forkBranches = branches;
      joinId = emitJoin(id, step.name, branchExits, BYPASS_LANE_THIN_WIDTH);
      exitIds = [joinId];
    } else if (step.type === 'parallel') {
      const parallelStep = step as ParallelStep;
      const branches = Array.isArray(parallelStep.branches) ? parallelStep.branches : [];
      const branchExits: string[] = [];
      const parallelBranches: StructureBranch[] = [];
      branches.forEach((branch, idx) => {
        const branchSteps = toSteps(branch.steps);
        if (branchSteps.length === 0) {
          // An empty branch keeps its lane, like an `if` without `else`.
          const bypassId = emitBypassBranch(
            id,
            `${step.name}-branch-${idx}-bypass`,
            `branch-${idx}`,
            {
              branchType: 'parallel',
              branchIndex: idx,
              label: branch.name ?? `branch ${idx + 1}`,
            }
          );
          parallelBranches.push({
            head: bypassId,
            items: [],
            label: branch.name ?? `branch ${idx + 1}`,
          });
          branchExits.push(bypassId);
          return;
        }
        const inner = transformInternal([], branchSteps, ids, ctx);
        mergeInner(inner);
        const firstId = inner.headId;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-branch-${idx}`,
            source: id,
            target: firstId,
            branchType: 'parallel',
            branchIndex: idx,
            label: branch.name ?? `branch ${idx + 1}`,
          });
          parallelBranches.push({
            head: firstId,
            items: inner.items,
            label: branch.name ?? `branch ${idx + 1}`,
          });
        }
        branchExits.push(...inner.leafIds);
      });
      forkBranches = parallelBranches;
      if (branchExits.length > 0) {
        joinId = emitJoin(id, step.name, branchExits, BYPASS_LANE_THIN_WIDTH);
        exitIds = [joinId];
      }
    } else if (step.type === 'switch') {
      const switchStep = step as SwitchStep;
      const cases = Array.isArray(switchStep.cases) ? switchStep.cases : [];
      const branchExits: string[] = [];
      const switchBranches: StructureBranch[] = [];

      const defaultSteps = toSteps(switchStep.default);
      const hasDefault = defaultSteps.length > 0;

      // Rule 1 — one labeled edge per case (label = match value).
      cases.forEach((caseItem, idx) => {
        const matchLabel = String(caseItem.match ?? '');
        const caseSteps = toSteps(caseItem.steps);
        if (caseSteps.length === 0) {
          // An empty case keeps its labelled lane instead of falling through the gate,
          // so the branch stays visible while the author is still filling it in.
          const bypassId = emitBypassBranch(id, `${step.name}-case-${idx}-bypass`, `case-${idx}`, {
            branchType: 'switch',
            branchIndex: idx,
            label: matchLabel,
          });
          switchBranches.push({ head: bypassId, items: [], label: matchLabel });
          branchExits.push(bypassId);
          return;
        }
        const inner = transformInternal([], caseSteps, ids, ctx);
        mergeInner(inner);
        const firstId = inner.headId;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-case-${idx}`,
            source: id,
            target: firstId,
            branchType: 'switch',
            branchIndex: idx,
            label: matchLabel,
          });
          switchBranches.push({ head: firstId, items: inner.items, label: matchLabel });
        }
        branchExits.push(...inner.leafIds);
      });

      // Rule 2 — `default` branch, labeled 'default'.
      if (hasDefault) {
        const inner = transformInternal([], defaultSteps, ids, ctx);
        mergeInner(inner);
        const firstId = inner.headId;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-default`,
            source: id,
            target: firstId,
            branchType: 'switch',
            label: 'default',
          });
          switchBranches.push({ head: firstId, items: inner.items, label: 'default' });
        }
        branchExits.push(...inner.leafIds);
      } else {
        // Rule 3 — no explicit `default`: synthesize a bypass lane node labeled
        // 'default' so the implicit fall-through renders as a balanced, labeled
        // lane aside instead of an unlabeled edge from the gate.
        const bypassId = emitBypassBranch(id, `${step.name}-default-bypass`, 'default', {
          branchType: 'switch',
          label: 'default',
        });
        switchBranches.push({ head: bypassId, items: [], label: 'default' });
        branchExits.push(bypassId);
      }

      forkBranches = switchBranches;
      if (branchExits.length > 0) {
        joinId = emitJoin(id, step.name, branchExits, BYPASS_LANE_MEASURABLE_WIDTH);
        exitIds = [joinId];
      }
    } else if (step.type === 'merge') {
      const mergeStep = step as MergeStep;
      const childSteps = toSteps(mergeStep.steps);
      const inner = transformInternal([], childSteps, ids, ctx);
      attached = inner.items;
      mergeInner(inner);
      const firstId = inner.headId;
      if (firstId) {
        edges.push({ id: `${id}:${firstId}`, source: id, target: firstId });
      }
      // Single contained body — exit from the wrapping step.
    }

    // ── fallback lane (on-failure.fallback) ──────────────────────────────
    // Placed after all control-flow arms so exitIds is already final for
    // this step. The failure edge goes into `failureEdges` and is appended
    // at the end — keeping [spine, fallback] declaration order so dagre puts
    // the lane on the +cross side (Decision 8).
    let fallbackSteps: Step[] = [];
    visitStepChildSlots(step, (slot, children) => {
      if (slot.kind === 'fallback') fallbackSteps = children;
    });

    if (fallbackSteps.length > 0) {
      const inner = transformInternal([], fallbackSteps, ids, {
        graphId: ctx.graphId,
        fallbackDepth: ctx.fallbackDepth + 1,
      });
      // Stamp fallbackOf on every non-trigger node in the lane (step and
      // foreachGroup containers). Stamping foreachGroup containers lets the
      // layout engine place the container in the lane's gutter; its inner nodes
      // remain in the container's own dagre graph and are not stamped here.
      // Only stamp where unset so the innermost owner wins in nested fallbacks.
      // Collect the ids of stamped nodes — these are exactly the lane's node set
      // (exclusive by construction: nested-lane nodes are already stamped).
      const laneNodes: string[] = [];
      for (const n of inner.nodes) {
        if (n.type !== 'trigger') {
          if (n.data.fallbackOf === undefined) {
            n.data.fallbackOf = id;
            laneNodes.push(n.id);
          }
        }
      }

      // Claim synthetic bypass nodes (from unbalanced if/switch inside this
      // fallback) into the lane's node set. Bypass nodes have no `data.fallbackOf`
      // so the stamp loop above never reaches them. Without this,
      // layoutGraphWithLanes classifies them as spine nodes while their sibling
      // gate nodes are lane nodes — the gate→bypass edge degrades to points:[].
      // Innermost lane wins: skip any bypass already claimed by a nested lane.
      const nestedLaneNodeIds = new Set(inner.fallbackLanes.flatMap((l) => l.nodes));
      for (const bypass of inner.bypassLaneNodes) {
        if (!nestedLaneNodeIds.has(bypass.id)) {
          laneNodes.push(bypass.id);
        }
      }
      // Stamp foreachGroup inner nodes for minimap tinting — but do NOT add
      // them to laneNodes (they belong to the container's own dagre graph).
      for (const g of inner.foreachGroups) {
        for (const n of g.innerNodes) {
          if (n.type === 'step') {
            if (n.data.fallbackOf === undefined) n.data.fallbackOf = id;
          }
        }
      }

      mergeInner(inner);

      const headId = inner.headId;
      if (headId) {
        const laneLeaves = inner.leafIds;
        fallbackLanes.push({
          owner: id,
          head: headId,
          leaves: laneLeaves,
          nodes: laneNodes,
          depth: ctx.fallbackDepth,
          graphId: ctx.graphId,
        });

        // Shape 2: continue → rejoin. Add fallback leaves to exitIds so the
        // existing fan-in loop emits rejoin edges automatically on the NEXT
        // sibling step. Uses engine's own rule verbatim (Decision 6).
        const onFailure = (step as Record<string, unknown>)['on-failure'] as
          | { continue?: boolean | string }
          | undefined;
        const hasContinuePath =
          typeof onFailure?.continue === 'string' || onFailure?.continue === true;
        lanes.push({ head: headId, items: inner.items, rejoins: hasContinuePath });
        if (hasContinuePath) {
          exitIds = dedupeIds([...exitIds, ...laneLeaves]);
          // Record these as rejoin sources so the fan-in loop on the NEXT
          // sibling step tags those edges `isRejoin: true`.
          for (const leafId of laneLeaves) {
            rejoinSourceIds.add(leafId);
          }
        }

        // Defer the failure edge — append after all spine/branch edges.
        failureEdges.push({
          id: `${id}:${headId}`,
          source: id,
          target: headId,
          isFailure: true,
          label: 'on failure',
        });
      }
    }

    if (containerBody) {
      items.push({ kind: 'container', id, body: containerBody, lanes });
    } else if (forkBranches && forkBranches.length > 0) {
      items.push({ kind: 'fork', id, branches: forkBranches, lanes });
      // The join sits on the spine right after its fork, so pack puts it under the owner.
      if (joinId) items.push({ kind: 'step', id: joinId, lanes: [] });
    } else {
      items.push({ kind: 'step', id, lanes, ...(attached ? { attached } : {}) });
    }

    prevExitIds = exitIds;
  }

  // Return failureEdges separately — the caller decides where to concatenate.
  // Only the two graph-level boundaries merge them (transformWorkflowToGraph and
  // the foreachGroups push), keeping [structural, failure] order per graph.
  return {
    nodes,
    edges,
    failureEdges,
    foreachGroups,
    bypassLaneNodes,
    nodeRefs,
    fallbackLanes,
    forkNodeToJoinId,
    leafIds: prevExitIds,
    headId: stepIds[0],
    items,
  };
}
