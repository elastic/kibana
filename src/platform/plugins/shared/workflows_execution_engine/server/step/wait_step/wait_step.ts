/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { StepImplementation } from '../step_base';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { ConnectorExecutor } from '../../connector_executor';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class WaitStepImpl implements StepImplementation {
  constructor(
    private node: any,
    private contextManager: WorkflowContextManager,
    private connectorExecutor: ConnectorExecutor,
    private workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    await this.workflowState.startStep(this.node.id);
    await new Promise((resolve) => setTimeout(resolve, this.node.configuration.with.duration));
    await this.workflowState.finishStep(this.node.id);
  }
}
