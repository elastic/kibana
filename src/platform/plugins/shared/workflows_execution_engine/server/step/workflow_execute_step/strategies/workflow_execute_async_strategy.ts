/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';

export class WorkflowExecuteAsyncStrategy {
  constructor(
    private workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async execute(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    this.stepExecutionRuntime.startStep();

    try {
      // Execute workflow without waiting
      const workflowExecution = this.stepExecutionRuntime.workflowExecution;
      const { workflowExecutionId } = await this.workflowsExecutionEngine.executeWorkflow(
        this.toExecutionModel(workflow),
        {
          spaceId,
          inputs,
          triggeredBy: 'workflow-step',
          parentWorkflowId: workflowExecution.workflowId,
          parentWorkflowExecutionId: workflowExecution.id,
          parentStepId: this.stepExecutionRuntime.node.stepId,
        },
        request
      );

      this.workflowLogger.logInfo(`Started async sub-workflow execution: ${workflowExecutionId}`);

      // Fetch the execution to get startedAt timestamp
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        workflowExecutionId,
        spaceId
      );

      // Finish step immediately with execution ID and timing information
      const stepOutput: Record<string, unknown> = {
        workflowId: workflow.id,
        executionId: workflowExecutionId,
        awaited: false,
        status: 'pending',
      };

      if (execution?.startedAt) {
        stepOutput.startedAt = execution.startedAt;
      }

      this.stepExecutionRuntime.finishStep(stepOutput);
    } catch (error) {
      this.stepExecutionRuntime.failStep(error as Error);
    }

    this.workflowExecutionRuntime.navigateToNextNode();
  }

  private toExecutionModel(workflow: EsWorkflow): WorkflowExecutionEngineModel {
    return {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
      // Note: spaceId is not part of EsWorkflow type, but we have it from the context
      // The execution engine will use the spaceId from the execution context
      isTestRun: false,
    };
  }
}
