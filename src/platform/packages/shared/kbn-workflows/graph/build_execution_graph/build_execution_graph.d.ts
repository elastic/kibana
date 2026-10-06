/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';
import type {
  BaseStep,
  DataSetStep,
  ElasticsearchStep,
  KibanaStep,
  WaitForApprovalStep,
  WaitForInputStep,
  WaitStep,
  WorkflowExecuteAsyncStep,
  WorkflowExecuteStep,
  WorkflowSettings,
  WorkflowYaml,
} from '../../spec/schema';
import type { WorkflowGraphType } from '../types';
import type { GraphNodeUnion } from '../types/nodes/union';
/** Context used during the graph construction to keep track of settings and avoid cycles */
interface GraphBuildContext {
  /** Workflow settings to be used during nodes construction */
  settings: WorkflowSettings | undefined;
  /**
   * Stack of nodes to keep track of the current position in the graph and avoid cycles
   */
  stack: GraphNodeUnion[];
  /** Used to construct predictable unique node IDs */
  parentKey: string;
}
export declare function visitWaitStep(
  currentStep: WaitStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitWaitForInputStep(
  currentStep: WaitForInputStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitWaitForApprovalStep(
  currentStep: WaitForApprovalStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitDataSetStep(
  currentStep: DataSetStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitElasticsearchStep(
  currentStep: ElasticsearchStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitKibanaStep(
  currentStep: KibanaStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitWorkflowExecuteStep(
  currentStep: WorkflowExecuteStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitWorkflowExecuteAsyncStep(
  currentStep: WorkflowExecuteAsyncStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitWorkflowOutputStep(
  currentStep: BaseStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function visitAtomicStep(
  currentStep: BaseStep,
  context: GraphBuildContext
): WorkflowGraphType;
export declare function convertToWorkflowGraph(
  workflowSchema: WorkflowYaml,
  defaultSettings?: WorkflowSettings
): WorkflowGraphType;
export declare function convertToSerializableGraph(graph: graphlib.Graph): any;
export {};
