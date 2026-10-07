/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import type { EsWorkflow } from '@kbn/workflows';
import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { StrategyResult } from '../types';

export class WorkflowExecuteAsyncStrategy {
  constructor(
    private workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async execute(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest,
    parentDepth: number,
    inheritParentIdentity: boolean,
    parentStepName: string
  ): Promise<StrategyResult> {
    try {
      // Execute workflow without waiting
      const workflowExecution = this.stepExecutionRuntime.workflowExecution;
      const isTestRun = !!workflowExecution.isTestRun;
      const { workflowExecutionId } = await this.workflowsExecutionEngine.executeWorkflow(
        toWorkflowExecutionEngineModel(workflow, { isTestRun, isEphemeral: false }),
        {
          spaceId,
          inputs,
          triggeredBy: 'workflow-step',
          parentWorkflowInvocation: 'async',
          parentWorkflowId: workflowExecution.workflowId,
          parentWorkflowExecutionId: workflowExecution.id,
          parentStepId: this.stepExecutionRuntime.node.stepId,
          parentDepth,
          ...(inheritParentIdentity ? { inheritParentIdentity: true, parentStepName } : {}),
        },
        request
      );

      this.workflowLogger.logInfo(`Started async sub-workflow execution: ${workflowExecutionId}`);

      // Fetch the execution to get its startedAt timestamp and the status it has right now.
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        workflowExecutionId,
        spaceId
      );

      // `status` is a snapshot taken when the child was started, not a live value. It is already
      // final when the engine refused to run the child: `skipped` (dropped by its concurrency
      // policy) or `failed` (rejected inputs). Otherwise it is `pending`, or whatever the child
      // has reached by now.
      const stepOutput: JsonObject = {
        workflowId: workflow.id,
        executionId: workflowExecutionId,
        awaited: false,
        status: execution?.status ?? 'pending',
      };

      if (execution?.startedAt) {
        stepOutput.startedAt = execution.startedAt;
      }

      return { status: 'completed', output: stepOutput };
    } catch (error) {
      return { status: 'failed', error: error as Error };
    }
  }
}
