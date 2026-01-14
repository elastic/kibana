/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSetGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';

export interface DataSetStep extends BaseStep {
  with: Record<string, unknown>;
}

export class DataSetStepImpl extends BaseAtomicNodeImplementation<DataSetStep> {
  constructor(
    private node: DataSetGraphNode,
    stepExecutionRuntime: StepExecutionRuntime,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    const dataSetStep: DataSetStep = {
      name: node.stepId,
      type: node.stepType,
      spaceId: '',
      with: node.configuration.with || {},
    };
    super(dataSetStep, stepExecutionRuntime, undefined, workflowRuntime);
  }

  public override getInput(): unknown {
    const withData = this.node.configuration.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(withData);
  }

  protected override async _run(input: unknown): Promise<RunStepResult> {
    try {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        const error = new Error('Input must be an object with key-value pairs');
        this.workflowLogger.logError('Failed to set variables: invalid input type', error);
        return {
          input,
          output: undefined,
          error: ExecutionError.fromError(error).toSerializableObject(),
        };
      }

      const variables = input as Record<string, unknown>;
      const variableCount = Object.keys(variables).length;

      this.workflowLogger.logDebug(`Set ${variableCount} variable(s)`);

      // Variables are stored as step output and will be retrieved by context manager
      // when building context for subsequent steps
      return { input, output: variables, error: undefined };
    } catch (err) {
      const error = ExecutionError.fromError(err).toSerializableObject();
      this.workflowLogger.logError(
        'Failed to set variables',
        err instanceof Error ? err : new Error(String(err))
      );
      return { input, output: undefined, error };
    }
  }
}
