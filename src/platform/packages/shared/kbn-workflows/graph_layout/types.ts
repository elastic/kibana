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

export const DEFAULT_NODE_STYLE = { width: 300, height: 64 } as const;

/**
 * Style for a synthetic placeholder node representing an empty `if` branch lane.
 * The node is kept tiny (1×1) so dagre allocates a thin bypass lane without
 * creating visible whitespace. No visual content is rendered.
 */
export const PLACEHOLDER_NODE_STYLE = { width: 1, height: 1 } as const;

export const FLOW_CONTROL_STEP_TYPES: ReadonlySet<string> = new Set([
  'if',
  'merge',
  'parallel',
  'foreach',
  'atomic',
]);

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
  type: 'step' | 'trigger' | 'foreachGroup' | 'placeholder';
  style: NodeStyle;
}

export type LayoutDirection = 'TB' | 'LR';

export interface StepNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  step?: Step;
}

export interface TriggerNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  isTrigger: true;
}

export interface ForeachGroupNodeData extends Record<string, unknown> {
  label: string;
  stepType: 'foreach';
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

export interface PlaceholderNodeData extends Record<string, unknown> {
  /** Which branch of the parent `if` or `switch` fall-through this placeholder lane represents. */
  readonly branch: 'then' | 'else' | 'default';
}

/**
 * A synthetic invisible node inserted for the missing branch of an `if` step
 * that has only one branch present, or for the implicit fall-through lane of a
 * `switch` with no `default`. It lets dagre allocate a parallel lane so the
 * graph renders as a balanced fan-out / fan-in diamond. The node has no
 * backing workflow step and is intentionally absent from `nodeRefs`.
 */
export interface PreLayoutPlaceholderNode extends PreLayoutNodeBase {
  type: 'placeholder';
  data: PlaceholderNodeData;
}

export type PreLayoutNode =
  | PreLayoutStepNode
  | PreLayoutTriggerNode
  | PreLayoutForeachGroupNode
  | PreLayoutPlaceholderNode;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  branchType?: EdgeBranchType;
  branchIndex?: number;
  /** Display label rendered on the edge (e.g. 'true' / 'false' / case value). */
  label?: string;
  /**
   * True when this edge is part of a fan-in into a node that has 2+ sources
   * and at least one source is a synthetic placeholder (empty `if` branch lane).
   * The renderer uses this to route the edge on the merge bus (symmetric
   * inverted-bus fan-in matching the fork-bus fan-out).
   */
  isMerge?: boolean;
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
  data: StepNodeData | TriggerNodeData | ForeachGroupNodeData | PlaceholderNodeData;
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
