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
import { WorkflowTemplatingEngine } from '../templating_engine';
import { ConnectorExecutor } from '../connector_executor';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';

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
}

export type StepDefinition = BaseStep;

export abstract class StepBase<TStep extends BaseStep> {
  protected step: TStep;
  protected contextManager: WorkflowContextManager;
  protected templatingEngine: WorkflowTemplatingEngine;
  protected connectorExecutor: ConnectorExecutor;

  constructor(
    step: TStep,
    contextManager: WorkflowContextManager,
    connectorExecutor: ConnectorExecutor,
    templatingEngineType: 'mustache' | 'nunjucks' = 'nunjucks'
  ) {
    this.step = step;
    this.contextManager = contextManager;
    this.templatingEngine = new WorkflowTemplatingEngine(templatingEngineType);
    this.connectorExecutor = connectorExecutor;
  }

  public getName(): string {
    return this.step.name;
  }

  public async run(): Promise<RunStepResult> {
    const stepName = this.getName();

    // Set step context for logging
    this.contextManager.setCurrentStep(stepName, stepName, this.step.type);

    // Log step start
    this.contextManager.logStepStart(stepName);

    // const stepEvent = {
    //   event: { action: 'step-execution' },
    //   message: `Executing step: ${stepName}`,
    // };

    // Start timing
    // this.contextManager.startTiming(stepEvent);

    try {
      const result = await this._run();

      // Log success
      // this.contextManager.stopTiming({
      //   ...stepEvent,
      //   event: { ...stepEvent.event, outcome: 'success' },
      // });

      this.contextManager.logStepComplete(stepName, stepName, true);
      this.contextManager.appendStepResult(stepName, result);

      return result;
    } catch (error) {
      // Log failure
      // this.contextManager.logError(`Step ${stepName} failed`, error as Error, {
      //   event: { action: 'step-failed' },
      // });

      // this.contextManager.stopTiming({
      //   ...stepEvent,
      //   event: { ...stepEvent.event, outcome: 'failure' },
      // });

      this.contextManager.logStepComplete(stepName, stepName, false);

      const result = await this.handleFailure(error);
      this.contextManager.appendStepResult(stepName, result);

      return result;
    } finally {
      // Clear step context
      this.contextManager.clearCurrentStep();
    }
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
