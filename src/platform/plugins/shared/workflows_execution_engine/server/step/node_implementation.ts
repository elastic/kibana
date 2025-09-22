/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Import specific step types as needed from schema
// import { evaluate } from '@marcbachmann/cel-js'
import type { ConnectorExecutor } from '../connector_executor';
import { WorkflowTemplatingEngine } from '../templating_engine';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
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
  run(): Promise<void>;
}

export interface StepErrorCatcher {
  catchError(): Promise<void>;
}

export abstract class BaseAtomicNodeImplementation<TStep extends BaseStep>
  implements NodeImplementation
{
  protected step: TStep;
  protected contextManager: WorkflowContextManager;
  protected templatingEngine: WorkflowTemplatingEngine;
  protected connectorExecutor: ConnectorExecutor;
  protected workflowExecutionRuntime: WorkflowExecutionRuntimeManager;

  constructor(
    step: TStep,
    contextManager: WorkflowContextManager,
    connectorExecutor: ConnectorExecutor | undefined,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager
  ) {
    this.step = step;
    this.contextManager = contextManager;
    this.templatingEngine = new WorkflowTemplatingEngine();
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
    await this.workflowExecutionRuntime.startStep();

    const input = this.getInput();

    try {
      const result = await this._run(input);
      await this.workflowExecutionRuntime.setCurrentStepResult(result);
    } catch (error) {
      const result = await this.handleFailure(input, error);
      await this.workflowExecutionRuntime.setCurrentStepResult(result);
    } finally {
      await this.workflowExecutionRuntime.finishStep();
    }

    this.workflowExecutionRuntime.navigateToNextNode();
  }

  // Subclasses implement this to execute the step logic
  protected abstract _run(input?: any): Promise<RunStepResult>;

  // Helper for handling on-failure, retries, etc.
  protected async handleFailure(input: any, error: any): Promise<RunStepResult> {
    // Implement retry logic based on step['on-failure']
    return {
      input,
      output: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
