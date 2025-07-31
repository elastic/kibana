/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConnectorExecutor } from '../connector_executor';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { RunStepResult, StepBase, BaseStep } from './step_base';

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, any>;
}

export class ConnectorStepImpl extends StepBase<ConnectorStep> {
  constructor(
    step: ConnectorStep,
    contextManager: WorkflowContextManager,
    connectorExecutor: ConnectorExecutor,
    workflowState: WorkflowExecutionRuntimeManager,
    templatingEngineType: 'mustache' | 'nunjucks' = 'nunjucks'
  ) {
    super(step, contextManager, connectorExecutor, workflowState, templatingEngineType);
  }

  public async _run(): Promise<RunStepResult> {
    try {
      const step = this.step;

      // this.contextManager.logInfo(`Starting connector step: ${step.type}`, {
      //   event: { action: 'connector-step-start' },
      //   tags: ['connector', step.type],
      // });

      // Evaluate optional 'if' condition
      const shouldRun = await this.evaluateCondition(step.if);
      if (!shouldRun) {
        // this.contextManager.logInfo('Step skipped due to condition evaluation', {
        //   event: { action: 'step-skipped', outcome: 'success' },
        // });
        return { output: undefined, error: undefined };
      }

      // Get current context for templating
      const context = this.contextManager.getContext();

      // Render inputs from 'with'
      // this.contextManager.logDebug('Rendering step inputs');
      const renderedInputs = Object.entries(step.with ?? {}).reduce(
        (acc: Record<string, any>, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] = this.templatingEngine.render(value, context);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      // Execute the connector

      // this.contextManager.logInfo(`Executing connector: ${step.type}`, {
      //   event: { action: 'connector-execution' },
      //   tags: ['connector', 'execution'],
      // });

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console.log' || step.type === 'console') {
        // eslint-disable-next-line no-console
        console.log(step.with?.message);
        return { output: step.with?.message, error: undefined };
      } else if (step.type === 'delay') {
        const delayTime = step.with?.delay ?? 1000;
        // this.contextManager.logDebug(`Delaying for ${delayTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        return { output: `Delayed for ${delayTime}ms`, error: undefined };
      }

      const output = await this.connectorExecutor.execute(
        step.type, // e.g., 'slack.sendMessage'
        step['connector-id']!,
        renderedInputs
      );

      // this.contextManager.logInfo(`Connector execution completed successfully`, {
      //   event: { action: 'connector-success', outcome: 'success' },
      //   tags: ['connector', 'success'],
      // });

      return { output, error: undefined };
    } catch (error) {
      // this.contextManager.logError(`Connector execution failed: ${step.type}`, error as Error, {
      //   event: { action: 'connector-failed', outcome: 'failure' },
      //   tags: ['connector', 'error'],
      // });
      return await this.handleFailure(error);
    }
  }
}
