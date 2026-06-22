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

export type EdgeBranchType = 'then' | 'else';

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

export type PreLayoutNode = PreLayoutStepNode | PreLayoutTriggerNode | PreLayoutForeachGroupNode;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  branchType?: EdgeBranchType;
  branchIndex?: number;
  /** Display label rendered on the edge (e.g. 'true' / 'false' / case value). */
  label?: string;
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

export const SWITCH_DEFAULT_HANDLE = 'switch-default' as const;
export const switchCaseHandleId = (index: number): string => `switch-case-${index}`;

export function isStep(value: unknown): value is Step {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.type === 'string';
}
