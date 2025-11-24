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
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';

export interface RunStepResult {
  input: any;
  output: any;
  error: any;
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

export interface NodeImplementation {
  run(): Promise<void> | void;
}

export interface NodeWithErrorCatching {
  catchError(): Promise<void> | void;
}

export interface MonitorableNode {
  monitor(monitoredContext: StepExecutionRuntime): Promise<void> | void;
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
    this.stepExecutionRuntime.startStep();

    try {
      input = await this.getInput();
      this.stepExecutionRuntime.setInput(input);
      const result = await this._run(input);

      // Don't update step execution runtime if abort was initiated
      if (this.stepExecutionRuntime.abortController.signal.aborted) {
        return;
      }

      if (result.error) {
        this.stepExecutionRuntime.failStep(result.error);
      } else {
        this.stepExecutionRuntime.finishStep(result.output);
      }
    } catch (error) {
      const result = this.handleFailure(input, error);
      this.stepExecutionRuntime.failStep(result.error);
    }

    this.workflowExecutionRuntime.navigateToNextNode();
  }

  // Subclasses implement this to execute the step logic
  protected abstract _run(input?: any): Promise<RunStepResult>;

  // Helper for handling on-failure, retries, etc.
  protected handleFailure(input: any, error: any): RunStepResult {
    // Implement retry logic based on step['on-failure']
    // Build comprehensive error message including cause chain (messages only)
    const getErrorMessage = (err: any): string => {
      if (!(err instanceof Error)) return String(err);
      let msg = err.message;
      if (err.cause) {
        msg += `\nCaused by: ${getErrorMessage(err.cause)}`;
      }
      return msg;
    };
    return {
      input,
      output: undefined,
      error: getErrorMessage(error),
    };
  }
}
