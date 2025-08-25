/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorExecutor } from '../connector_executor';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from './step_base';
import { StepBase } from './step_base';

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
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, connectorExecutor, workflowState);
  }

  public async _run(): Promise<RunStepResult> {
    try {
      const step = this.step;

      // Evaluate optional 'if' condition
      const shouldRun = await this.evaluateCondition(step.if);
      if (!shouldRun) {
        return { output: undefined, error: undefined };
      }

      // Get current context for templating
      const context = this.contextManager.getContext();

      // Parse step type and determine if it's a sub-action
      const [stepType, subActionName] = step.type.includes('.')
        ? step.type.split('.', 2)
        : [step.type, null];
      const isSubAction = subActionName !== null;

      // Render inputs from 'with'
      const withInputs = Object.entries(step.with ?? {}).reduce(
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

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console.log' || step.type === 'console') {
        this.workflowLogger.logInfo(`Log from step ${step.name}: \n${withInputs.message}`, {
          event: { action: 'log', outcome: 'success' },
          tags: ['console', 'log'],
        });
        // eslint-disable-next-line no-console
        console.log(withInputs.message);
        return { output: withInputs.message, error: undefined };
      } else if (step.type === 'delay') {
        const delayTime = step.with?.delay ?? 1000;
        // this.contextManager.logDebug(`Delaying for ${delayTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        return { output: `Delayed for ${delayTime}ms`, error: undefined };
      }

      // Build final rendered inputs
      const renderedInputs = isSubAction
        ? {
            subActionParams: withInputs,
            subAction: subActionName,
          }
        : withInputs;

      const output = await this.connectorExecutor.execute(
        stepType,
        step['connector-id']!,
        renderedInputs,
        step.spaceId
      );

      const { data, status, message } = output;

      if (status === 'ok') {
        return { output: data, error: undefined };
      } else {
        return await this.handleFailure(message);
      }
    } catch (error) {
      return await this.handleFailure(error);
    }
  }
}
