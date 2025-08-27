/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseStep } from '@kbn/workflows'; // Adjust path as needed
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { StepImplementation } from './step_base';
// Import schema and inferred types
import type { ConnectorExecutor } from '../connector_executor';
import {
  EnterConditionBranchNodeImpl,
  EnterIfNodeImpl,
  ExitIfNodeImpl,
  ExitConditionBranchNodeImpl,
} from './if_step';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterForeachNodeImpl, ExitForeachNodeImpl } from './foreach_step';
import { AtomicStepImpl } from './atomic_step/atomic_step_impl';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WaitStepImpl } from './wait_step/wait_step';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
import { EnterRetryNodeImpl, ExitRetryNodeImpl } from './retry_step';
// Import specific step implementations
// import { ForEachStepImpl } from './foreach-step'; // To be created
// import { IfStepImpl } from './if-step'; // To be created
// import { AtomicStepImpl } from './atomic-step'; // To be created
// import { ParallelStepImpl } from './parallel-step'; // To be created
// import { MergeStepImpl } from './merge-step'; // To be created

export class StepFactory {
  constructor(
    private contextManager: WorkflowContextManager,
    private connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger, // Assuming you have a logger interface
    private workflowTaskManager: WorkflowTaskManager
  ) {}

  public create<TStep extends BaseStep>(
    step: TStep // TODO: TStep must refer to a node type, not BaseStep (IfElseNode, ForeachNode, etc.)
  ): StepImplementation {
    const stepType = (step as any).type; // Use a more type-safe way to determine step type if possible

    if (!stepType) {
      throw new Error('Step type is not defined for step: ' + JSON.stringify(step));
    }

    switch (stepType) {
      case 'enter-foreach':
        return new EnterForeachNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          this.workflowLogger
        );
      case 'exit-foreach':
        return new ExitForeachNodeImpl(step as any, this.workflowRuntime, this.workflowLogger);
      case 'enter-retry':
        return new EnterRetryNodeImpl(
          step as any,
          this.workflowRuntime,
          this.workflowTaskManager,
          this.workflowLogger
        );
      case 'exit-retry':
        return new ExitRetryNodeImpl(step as any, this.workflowRuntime, this.workflowLogger);
      case 'enter-if':
        return new EnterIfNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          this.workflowLogger
        );
      case 'enter-condition-branch':
        return new EnterConditionBranchNodeImpl(this.workflowRuntime);
      case 'exit-condition-branch':
        return new ExitConditionBranchNodeImpl(step as any, this.workflowRuntime);
      case 'exit-if':
        return new ExitIfNodeImpl(step as any, this.workflowRuntime);
      case 'wait':
        return new WaitStepImpl(
          step as any,
          this.workflowRuntime,
          this.workflowLogger,
          this.workflowTaskManager
        );
      case 'atomic':
        return new AtomicStepImpl(
          step as any,
          this.contextManager,
          this.connectorExecutor,
          this.workflowRuntime,
          this.workflowLogger
        );
      case 'parallel':
      // return new ParallelStepImpl(step as ParallelStep, contextManager);
      case 'merge':
      // return new MergeStepImpl(step as MergeStep, contextManager);
      default:
        throw new Error(`Unknown node type: ${stepType}`);
    }
  }
}
