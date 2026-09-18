/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '../spec/schema';

export type Step = WorkflowYaml['steps'][number];

export const DEFAULT_NODE_STYLE = { width: 300, height: 52 } as const;

export const FLOW_CONTROL_STEP_TYPES: ReadonlySet<string> = new Set([
  'if',
  'merge',
  'parallel',
  'foreach',
  'while',
  'atomic',
]);

/**
 * Step types that render as a group container node (one-in/one-out "folder"
 * with inner steps rendered inside). This is the single source of truth
 * consumed by both the transform and any code that needs to enumerate
 * child-bearing container types — keeps it in sync with `visitStepChildren`.
 *
 * `atomic` is intentionally excluded: it is an internal implementation detail
 * never exposed in user-authored workflows.
 */
export const CONTAINER_STEP_TYPES: ReadonlySet<string> = new Set(['foreach', 'while']);

export const TRIGGER_STEP_TYPES: ReadonlySet<string> = new Set([
  'manual',
  'alert',
  'scheduled',
  'document',
]);

export type EdgeBranchType = 'then' | 'else' | 'switch';

export interface NodeStyle {
  width: number;
  height: number;
}

export interface PreLayoutNodeBase {
  id: string;
  type: 'step' | 'trigger' | 'foreachGroup';
  style: NodeStyle;
}

export type LayoutDirection = 'TB' | 'LR';

export interface StepNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  step?: Step;
  /**
   * Present on every node inside a fallback lane. Holds the **node id** of the
   * owner step (the step whose `on-failure.fallback` created this lane).
   * Absent for all other nodes. Renderers use this to tint fallback nodes and
   * the minimap; specs 03/07 use it to derive "is this node inside a fallback
   * lane?" without a separate nodeRefs lookup.
   */
  fallbackOf?: string;
}

export interface TriggerNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  isTrigger: true;
}

export interface ForeachGroupNodeData extends Record<string, unknown> {
  label: string;
  /** The original step type (e.g. `'foreach'`, `'while'`). */
  stepType: string;
  step: Step;
}

export interface PreLayoutStepNode extends PreLayoutNodeBase {
  type: 'step';
  data: StepNodeData;
}
export interface PreLayoutTriggerNode extends PreLayoutNodeBase {
  type: 'trigger';
  data: TriggerNodeData;
}
export interface PreLayoutForeachGroupNode extends PreLayoutNodeBase {
  type: 'foreachGroup';
  data: ForeachGroupNodeData;
}

export type PreLayoutNode = PreLayoutStepNode | PreLayoutTriggerNode | PreLayoutForeachGroupNode;

/**
 * A layout-only node representing the missing branch lane of an `if` step (or
 * the implicit fall-through of a `switch` with no `default`). It gives dagre a
 * parallel lane so the graph renders as a balanced diamond.
 *
 * Lives in `TransformResult.bypassLaneNodes` — separate from domain `nodes` —
 * so callers can pass it to the layout engine without treating it as a workflow
 * step. It has no `NodeRef` and is intentionally absent from `nodeRefs`.
 */
export interface PreLayoutBypassLaneNode {
  readonly id: string;
  readonly style: NodeStyle;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  branchType?: EdgeBranchType;
  branchIndex?: number;
  /** Display label rendered on the edge (e.g. 'true' / 'false' / case value). */
  label?: string;
  /**
   * True on the edge from a step's node to its fallback lane head. Always dashed;
   * colour transitions from neutral to danger when any node in the lane has a
   * step-execution record. Never set on spine edges or `if`/`switch` fork edges.
   */
  isFailure?: boolean;
}

/**
 * One fallback lane emitted by the transform. Used by the renderer to build
 * owner / head / leaf sets for traversal highlighting and `mergeNodeIds` widening.
 */
export interface FallbackLane {
  /** Node id of the step that owns this lane (has `on-failure.fallback`). */
  readonly owner: string;
  /** Node id of the first step in the fallback sequence. */
  readonly head: string;
  /** Node ids of the last steps in the fallback sequence (the rejoin sources). */
  readonly leaves: readonly string[];
}

/**
 * A `GraphEdge` after dagre layout has run. The `points` array holds the
 * orthogonal waypoints dagre computed so the renderer can route the edge
 * around other nodes instead of cutting through them.
 */
export interface LayoutedEdge extends GraphEdge {
  points: Array<{ x: number; y: number }>;
}

export interface ForeachGroup {
  id: string;
  innerNodes: PreLayoutNode[];
  innerEdges: GraphEdge[];
  /** Layout-only bypass lane nodes for unbalanced branches inside this foreach body. */
  bypassLaneNodes: PreLayoutBypassLaneNode[];
}

/**
 * A typed back-pointer from a laid-out graph node back to its source in the
 * workflow definition — either a step (identified by its exact `name` string,
 * which is the key used in `WorkflowLookup`) or a trigger (identified by its
 * zero-based declaration index so callers can do an exact `triggers[index]`
 * lookup rather than guessing by type).
 */
export type NodeRef =
  | { readonly kind: 'step'; readonly stepName: string }
  | { readonly kind: 'trigger'; readonly triggerIndex: number; readonly triggerType: string };

/** Side a node anchors its source/target handle on. Maps to `@xyflow/react`'s `Position`. */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export interface LayoutedNode extends PreLayoutNodeBase {
  data: StepNodeData | TriggerNodeData | ForeachGroupNodeData;
  position: { x: number; y: number };
  /** Where the incoming-edge handle should attach (set by `applyGraphLayout`). */
  targetPosition?: HandleSide;
  /** Where the outgoing-edge handle should attach (set by `applyGraphLayout`). */
  sourcePosition?: HandleSide;
}

export function isStep(value: unknown): value is Step {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.type === 'string';
}
