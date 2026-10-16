/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EdgeBranchType } from '@kbn/workflows';

/** Data carried by `workflowEdge` edges (written by `useWorkflowLayout` and the canvas). */
export interface WorkflowEdgeData extends Record<string, unknown> {
  readonly label?: string;
  readonly traversed?: boolean;
  /** Switch bus routing marker — present on all case/default edges of a switch node. */
  readonly branchType?: EdgeBranchType;
  /**
   * True when this edge participates in any fan-in (multiple predecessors
   * converging on the same target). Routes the edge on the merge bus
   * (symmetric inverted-bus fan-in matching the fork-bus fan-out) so the
   * lane change happens as late as possible — just above the target node.
   */
  readonly isMerge?: boolean;
  /**
   * True when the target node is a synthetic placeholder — suppresses the
   * arrowhead so the in-edge and out-edge form one continuous line mid-lane.
   */
  readonly hideEndMarker?: boolean;
  /**
   * True on the edge from a step to its fallback lane head. Renders as always-
   * dashed; stroke colour transitions from `borderBaseProminent` to `danger`
   * once any node in the lane has a step-execution record (ADR-0010 decision 9).
   */
  readonly isFailure?: boolean;
  /** Draw the stroke in when a step was just inserted (insert layout animation). */
  readonly drawIn?: boolean;
}

/** Data carried by `bypassLane` nodes. */
export interface WorkflowBypassLaneData extends Record<string, unknown> {
  /** True when the empty branch this lane stands for is the one that executed. */
  readonly traversed?: boolean;
}

interface NodeWithData {
  readonly data?: Readonly<Record<string, unknown>>;
}

/** The node's `label` when it is a string (graph nodes and React Flow nodes alike). */
export const nodeLabel = (node: NodeWithData | undefined): string | undefined => {
  const label = node?.data?.label;
  return typeof label === 'string' ? label : undefined;
};

/** The node's `stepType` when it is a string. */
export const nodeStepType = (node: NodeWithData | undefined): string | undefined => {
  const stepType = node?.data?.stepType;
  return typeof stepType === 'string' ? stepType : undefined;
};
