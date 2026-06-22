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
  SWITCH_DEFAULT_HANDLE,
  TRIGGER_STEP_TYPES,
  switchCaseHandleId,
  type EdgeBranchType,
  type ForeachGroup,
  type ForeachGroupNodeData,
  type GraphEdge,
  type HandleSide,
  type LayoutDirection,
  type NodeStyle,
  type PreLayoutNode,
  type PreLayoutStepNode,
  type PreLayoutTriggerNode,
  type StepNodeData,
  type TriggerNodeData,
} from './types';
export { computeTopologyFingerprint } from './compute_topology_fingerprint';
export { transformWorkflowToGraph, type TransformResult } from './transform_workflow_to_graph';
