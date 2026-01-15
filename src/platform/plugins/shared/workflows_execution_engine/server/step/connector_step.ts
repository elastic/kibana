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

import { ExecutionError } from '@kbn/workflows/server';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, any>;
}

export class ConnectorStepImpl extends BaseAtomicNodeImplementation<ConnectorStep> {
  constructor(
    step: ConnectorStep,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor,
    workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, stepExecutionRuntime, connectorExecutor, workflowState);
  }

  public getInput() {
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
      this.step.with || {}
    );
  }

  public async _run(withInputs?: any): Promise<RunStepResult> {
    try {
      const step = this.step;

      // Parse step type and determine if it's a sub-action
      const [stepType, subActionName] = step.type.includes('.')
        ? step.type.split('.', 2)
        : [step.type, null];
      const isSubAction = subActionName !== null;

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console') {
        this.workflowLogger.logInfo(`Log from step ${step.name}: \n${withInputs.message}`, {
          workflow: { step_id: step.name },
          event: { action: 'log', outcome: 'success' },
          tags: ['console', 'log'],
        });
        return {
          input: withInputs,
          output: withInputs.message,
          error: undefined,
        };
      }

      // Build final rendered inputs
      const renderedInputs = isSubAction
        ? {
            subActionParams: withInputs,
            subAction: subActionName,
          }
        : withInputs;

      const connectorIdRendered =
        this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
          step['connector-id']
        );

      if (!connectorIdRendered) {
        throw new Error(`Connector ID is required`);
      }

      const output = await this.connectorExecutor.execute(
        stepType,
        connectorIdRendered,
        renderedInputs,
        step.spaceId,
        this.stepExecutionRuntime.abortController
      );

      const { data, status, message, serviceMessage } = output;

      if (status === 'ok') {
        return {
          input: withInputs,
          output: data,
          error: undefined,
        };
      } else {
        return {
          input: withInputs,
          output: undefined,
          error: new ExecutionError({
            type: 'ConnectorExecutionError',
            message: serviceMessage ?? message ?? 'Unknown error',
          }),
        };
      }
    } catch (error) {
      return this.handleFailure(withInputs, error);
    }
  }
}
