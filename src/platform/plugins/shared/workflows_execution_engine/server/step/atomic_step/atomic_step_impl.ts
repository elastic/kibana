/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { AtomicGraphNode } from '@kbn/workflows/types/execution/nodes/base';
import { StepImplementation } from '../step_base';
import { ConnectorStepImpl } from '../connector_step';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { ConnectorExecutor } from '../../connector_executor';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

/**
 * Implements the execution logic for an atomic workflow step.
 *
 * `AtomicStepImpl` is responsible for running a single atomic step within a workflow.
 * It delegates the execution to a `ConnectorStepImpl`, passing the necessary configuration,
 * context manager, connector executor, and workflow state.
 *
 * @remarks
 * This class is typically used internally by the workflow execution engine to process
 * atomic nodes in the workflow graph.
 *
 * @param node - The atomic graph node containing step configuration.
 * @param contextManager - Manages workflow context and state.
 * @param connectorExecutor - Executes connector operations for the step.
 * @param workflowState - Manages the runtime state of workflow execution.
 */
export class AtomicStepImpl implements StepImplementation {
  constructor(
    private node: AtomicGraphNode,
    private contextManager: WorkflowContextManager,
    private connectorExecutor: ConnectorExecutor,
    private workflowState: WorkflowExecutionRuntimeManager
  ) {}

  async run(): Promise<void> {
    // This class should decide what action to take based on action type
    // like connector, logger, http call, etc.
    // for now it only calls ConnectorStepImpl
    await new ConnectorStepImpl(
      this.node.configuration,
      this.contextManager,
      this.connectorExecutor,
      this.workflowState
    ).run();
  }
}
