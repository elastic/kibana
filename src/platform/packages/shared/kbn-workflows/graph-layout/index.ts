/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  DEFAULT_NODE_STYLE,
  FLOW_CONTROL_STEP_TYPES,
  TRIGGER_STEP_TYPES,
  isStep as isGraphLayoutStep,
  type EdgeBranchType,
  type ForeachGroup,
  type ForeachGroupNodeData,
  type GraphEdge,
  type HandleSide,
  type LayoutedNode,
  type NodeStyle,
  type PreLayoutForeachGroupNode,
  type PreLayoutNode,
  type PreLayoutNodeBase,
  type PreLayoutStepNode,
  type PreLayoutTriggerNode,
  type StepNodeData,
  type TriggerNodeData,
} from './types';
export { IdAllocator, slugify } from './id_allocator';
export { walkStepTree, visitStepChildren } from './walk_step_tree';
export { computeTopologyFingerprint } from './compute_topology_fingerprint';
export { transformWorkflowToGraph, type TransformResult } from './transform_workflow_to_graph';
export {
  applyGraphLayout,
  layoutForeachGroup,
  type ApplyLayoutOptions,
  type ApplyLayoutResult,
  type LayoutDirection,
} from './apply_graph_layout';
