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
  output: any;
  error: any;
}

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

export interface StepImplementation {
  run(): Promise<void>;
}

export abstract class StepBase<TStep extends BaseStep> implements StepImplementation {
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

  public async run(): Promise<void> {
    const stepId = (this.step as any).id || this.getName();

    await this.workflowExecutionRuntime.startStep(stepId);

    try {
      const result = await this._run();
      await this.workflowExecutionRuntime.setStepResult(stepId, result);
    } catch (error) {
      const result = await this.handleFailure(error);
      await this.workflowExecutionRuntime.setStepResult(stepId, result);
    } finally {
      await this.workflowExecutionRuntime.finishStep(stepId);
    }

    this.workflowExecutionRuntime.goToNextStep();
  }

  // Subclasses implement this to execute the step logic
  protected abstract _run(): Promise<RunStepResult>;

  // Helper to handle common logic like condition evaluation, retries, etc.
  protected async evaluateCondition(condition: string | undefined): Promise<boolean> {
    if (!condition) return true;
    // Use templating engine to evaluate condition with context
    // For now, placeholder: assume it's true if condition exists
    // Integrate with TemplatingEngine in actual implementation
    // const context = this.contextManager.getContext();
    // const parsedCondition = this.templatingEngine.render(condition, context);
    // return evaluate(parsedCondition, context);
    return true;
  }

  // Helper for handling on-failure, retries, etc.
  protected async handleFailure(error: any): Promise<RunStepResult> {
    // Implement retry logic based on step['on-failure']
    return {
      output: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
