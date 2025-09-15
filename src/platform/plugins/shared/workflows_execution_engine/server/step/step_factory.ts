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
import type { UrlValidator } from '../lib/url_validator';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
import { AtomicStepImpl } from './atomic_step/atomic_step_impl';
import { EnterForeachNodeImpl, ExitForeachNodeImpl } from './foreach_step';
import { HttpStepImpl } from './http_step';
import {
  EnterConditionBranchNodeImpl,
  EnterIfNodeImpl,
  ExitConditionBranchNodeImpl,
  ExitIfNodeImpl,
} from './if_step';
import { EnterRetryNodeImpl, ExitRetryNodeImpl } from './on_failure/retry_step';
import { EnterContinueNodeImpl, ExitContinueNodeImpl } from './on_failure/continue_step';
import {
  EnterTryBlockNodeImpl,
  ExitTryBlockNodeImpl,
  EnterNormalPathNodeImpl,
  ExitNormalPathNodeImpl,
  EnterFallbackPathNodeImpl,
  ExitFallbackPathNodeImpl,
} from './on_failure/fallback-step';
import { WaitStepImpl } from './wait_step/wait_step';

export class StepFactory {
  constructor(
    private contextManager: WorkflowContextManager,
    private connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger, // Assuming you have a logger interface
    private workflowTaskManager: WorkflowTaskManager,
    private urlValidator: UrlValidator
  ) {}

  public create<TStep extends BaseStep>(
    step: TStep // TODO: TStep must refer to a node type, not BaseStep (IfElseNode, ForeachNode, etc.)
  ): StepImplementation {
    const stepType = (step as any).type; // Use a more type-safe way to determine step type if possible
    const stepId = (step as any).id || (step as any).name;
    if (!stepType) {
      throw new Error('Step type is not defined for step: ' + JSON.stringify(step));
    }
    const stepLogger = this.workflowLogger.createStepLogger(
      this.workflowRuntime.getCurrentStepExecutionId(),
      stepId,
      stepId,
      stepType
    );
    switch (stepType) {
      case 'enter-foreach':
        return new EnterForeachNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          stepLogger
        );
      case 'exit-foreach':
        return new ExitForeachNodeImpl(step as any, this.workflowRuntime, stepLogger);
      case 'enter-retry':
        return new EnterRetryNodeImpl(
          step as any,
          this.workflowRuntime,
          this.workflowTaskManager,
          stepLogger
        );
      case 'exit-retry':
        return new ExitRetryNodeImpl(step as any, this.workflowRuntime, stepLogger);
      case 'enter-continue':
        return new EnterContinueNodeImpl(step as any, this.workflowRuntime, stepLogger);
      case 'exit-continue':
        return new ExitContinueNodeImpl(this.workflowRuntime);
      case 'enter-try-block':
        return new EnterTryBlockNodeImpl(step as any, this.workflowRuntime);
      case 'exit-try-block':
        return new ExitTryBlockNodeImpl(step as any, this.workflowRuntime);
      case 'enter-normal-path':
        return new EnterNormalPathNodeImpl(step as any, this.workflowRuntime, stepLogger);
      case 'enter-fallback-path':
        return new EnterFallbackPathNodeImpl(this.workflowRuntime);
      case 'exit-normal-path':
        return new ExitNormalPathNodeImpl(step as any, this.workflowRuntime);
      case 'exit-fallback-path':
        return new ExitFallbackPathNodeImpl(step as any, this.workflowRuntime);
      case 'enter-if':
        return new EnterIfNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          stepLogger
        );
      case 'enter-then-branch':
      case 'enter-else-branch':
        return new EnterConditionBranchNodeImpl(step as any, this.workflowRuntime);
      case 'exit-then-branch':
      case 'exit-else-branch':
        return new ExitConditionBranchNodeImpl(step as any, this.workflowRuntime);
      case 'exit-if':
        return new ExitIfNodeImpl(step as any, this.workflowRuntime);
      case 'wait':
        return new WaitStepImpl(
          step as any,
          this.workflowRuntime,
          stepLogger,
          this.workflowTaskManager
        );
      case 'atomic':
        return new AtomicStepImpl(
          step as any,
          this.contextManager,
          this.connectorExecutor,
          this.workflowRuntime,
          stepLogger
        );
      case 'http':
        return new HttpStepImpl(
          step as any,
          this.contextManager,
          stepLogger,
          this.urlValidator,
          this.workflowRuntime
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
