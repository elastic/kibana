/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

// Import specific step types as needed from schema
// import { evaluate } from '@marcbachmann/cel-js'
import type { ExecutionError } from '@kbn/workflows';
import type { ConnectorExecutor } from '../connector_executor';
import { mapError } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';

export interface RunStepResult {
  input: any;
  output: any;
  error: ExecutionError | undefined;
}

// TODO: To remove it and replace with AtomicGraphNode
// Base step interface
export interface BaseStep {
  name: string;
  type: string;
  if?: string;
  foreach?: string;
  timeout?: number;
  spaceId: string;
}

export type StepDefinition = BaseStep;

/**
 * Interface for node implementations within the workflow execution engine.
 * These implementations define the behavior of various workflow steps.
 */
export interface NodeImplementation {
  /**
   * Executes the node's logic.
   */
  run(): Promise<void>;
}

/**
 * Node implementation that can catch errors within its scope.
 * For example, retry steps or continue steps.
 */
export interface NodeWithErrorCatching {
  /**
   * Handles errors that occur within the node's execution context.
   * @param failedContext The context of the failed step execution.
   */
  catchError(failedContext: StepExecutionRuntime): Promise<void>;
}

/**
 * Node implementation monitoring its scope.
 * For example, timeout zones.
 * @param monitoredContext The context of the monitored step execution.
 */
export interface MonitorableNode {
  /**
   * Monitors the execution context of the node.
   * @param monitoredContext The context of the monitored step execution.
   */
  monitor(monitoredContext: StepExecutionRuntime): Promise<void>;
}

export abstract class BaseAtomicNodeImplementation<TStep extends BaseStep> implements NodeImplementation {
  protected step: TStep;
  protected stepExecutionRuntime: StepExecutionRuntime;
  protected connectorExecutor: ConnectorExecutor;
  protected workflowExecutionRuntime: WorkflowExecutionRuntimeManager;

  constructor(
    step: TStep,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor | undefined,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager
  ) {
    this.step = step;
    this.stepExecutionRuntime = stepExecutionRuntime;
    this.connectorExecutor = connectorExecutor as any;
    this.workflowExecutionRuntime = workflowExecutionRuntime;
  }

  public getName(): string {
    return this.step.name;
  }

  public getInput(): any {
    return {};
  }

  public async run(): Promise<void> {
    let input: any;
    await this.stepExecutionRuntime.startStep();

    try {
      input = await this.getInput();
      await this.stepExecutionRuntime.setInput(input);
      const result = await this._run(input);

      // Don't update step execution runtime if abort was initiated
      if (this.stepExecutionRuntime.abortController.signal.aborted) {
        return;
      }

      if (result.error) {
        await this.stepExecutionRuntime.failStep(result.error);
      } else {
        await this.stepExecutionRuntime.finishStep(result.output);
      }
    } catch (error) {
      const result = await this.handleFailure(input, error);
      await this.stepExecutionRuntime.failStep(result.error || error);
    }

    this.workflowExecutionRuntime.navigateToNextNode();
  }

  // Subclasses implement this to execute the step logic
  protected abstract _run(input?: any): Promise<RunStepResult>;

  // Helper for handling on-failure, retries, etc.
  protected async handleFailure(input: any, error: any): Promise<RunStepResult> {
    return {
      input,
      output: undefined,
      error: mapError(error),
    };
  }
}
