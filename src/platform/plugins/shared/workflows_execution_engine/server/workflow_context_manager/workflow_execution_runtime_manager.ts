/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsWorkflowExecution, EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import { graphlib } from '@dagrejs/dagre';
import { withSpan } from '@kbn/apm-utils';
import { RunStepResult } from '../step/step_base';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { IWorkflowContextLogger } from './types';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecution: EsWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  workflowExecutionGraph: graphlib.Graph;
}

/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `WorkflowExecutionRuntimeManager` class is responsible for orchestrating the execution of workflow steps,
 * tracking their statuses, results, and runtime states, and updating the overall workflow execution status.
 * It maintains the topological order of steps, supports step navigation, and interacts with repositories to persist
 * execution data.
 *
 * Key responsibilities:
 * - Tracks execution status, results, and runtime state for each workflow step.
 * - Navigates between steps according to topological order, skipping steps as needed.
 * - Initiates and finalizes step and workflow executions, updating persistent storage.
 * - Handles workflow completion and error propagation.
 * - Creates APM traces compatible with APM TraceWaterfall embeddable
 *
 * @remarks
 * This class assumes that workflow steps are represented as nodes in a directed acyclic graph (DAG),
 * and uses topological sorting to determine execution order.
 */
export class WorkflowExecutionRuntimeManager {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private stepResults: Map<string, RunStepResult> = new Map();
  private stepStates: Map<string, Record<string, any> | undefined> = new Map();
  private currentStepIndex: number = 0;
  private topologicalOrder: string[];
  private contextManager?: IWorkflowContextLogger;

  // APM trace properties - consistent traceId for entire workflow execution
  private readonly traceId: string;
  private entryTransactionId?: string;

  public workflowExecution: EsWorkflowExecution;
  private workflowExecutionRepository: WorkflowExecutionRepository;
  private stepExecutionRepository: StepExecutionRepository;
  private workflowExecutionGraph: graphlib.Graph;

  constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit) {
    this.workflowExecution = workflowExecutionRuntimeManagerInit.workflowExecution;
    this.workflowExecutionRepository =
      workflowExecutionRuntimeManagerInit.workflowExecutionRepository;
    this.stepExecutionRepository = workflowExecutionRuntimeManagerInit.stepExecutionRepository;
    this.workflowExecutionGraph = workflowExecutionRuntimeManagerInit.workflowExecutionGraph;
    this.topologicalOrder = graphlib.alg.topsort(this.workflowExecutionGraph);

    // Use workflow execution ID as traceId for APM compatibility
    this.traceId = this.workflowExecution.id;
  }

  /**
   * Set the logger instance - called after construction to avoid circular dependencies
   */
  public setLogger(logger: IWorkflowContextLogger): void {
    this.contextManager = logger;
  }

  /**
   * Get the APM trace ID for this workflow execution
   */
  public getTraceId(): string {
    return this.traceId;
  }

  /**
   * Get the entry transaction ID (main workflow transaction)
   */
  public getEntryTransactionId(): string | undefined {
    return this.entryTransactionId;
  }

  public getWorkflowExecutionStatus(): ExecutionStatus {
    return this.workflowExecution.status;
  }

  public getCurrentStep(): any {
    // must be a proper type
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.topologicalOrder.length) {
      return null; // No current step
    }
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    return this.workflowExecutionGraph.node(currentStepId);
  }

  public goToStep(stepId: string): void {
    this.currentStepIndex = this.topologicalOrder.findIndex((id) => id === stepId);
  }

  public goToNextStep(): void {
    if (this.currentStepIndex < this.topologicalOrder.length - 1) {
      for (let i = this.currentStepIndex + 1; i < this.topologicalOrder.length; i++) {
        const nextStepId = this.topologicalOrder[i];
        if (this.stepExecutions.get(nextStepId)?.status !== ExecutionStatus.SKIPPED) {
          this.currentStepIndex = i;
          return;
        }
      }
      return;
    }

    this.currentStepIndex = -1;
  }

  public getStepResult(stepId: string): RunStepResult | undefined {
    return this.stepResults.get(stepId);
  }

  public async setStepResult(stepId: string, result: RunStepResult): Promise<void> {
    this.stepResults.set(stepId, result);
  }

  public getStepState(stepId: string): Record<string, any> | undefined {
    return this.stepStates.get(stepId);
  }

  public getStepStatus(stepId: string): ExecutionStatus | undefined {
    const stepExecution = this.stepExecutions.get(stepId);
    return stepExecution ? stepExecution.status : undefined;
  }

  public async setStepState(stepId: string, state: Record<string, any> | undefined): Promise<void> {
    this.stepStates.set(stepId, state);
  }

  public async startStep(stepId: string): Promise<void> {
    return withSpan(
      {
        name: `workflow.step.${stepId}`,
        type: 'workflow',
        subtype: 'step',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.traceId, // Ensure consistent traceId
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const workflowId = this.workflowExecution.workflowId;
        const workflowRunId = this.workflowExecution.id;
        const nodeId = stepId;
        const workflowStepExecutionId = `${workflowRunId}-${nodeId}`;
        const stepStartedAt = new Date();

        // Get step details from the graph
        const stepNode = this.workflowExecutionGraph.node(stepId) as any;
        const stepName = stepNode?.name || stepId;

        const stepExecution = {
          id: workflowStepExecutionId,
          workflowId,
          workflowRunId,
          stepId: nodeId,
          topologicalIndex: this.topologicalOrder.findIndex((id) => id === stepId),
          status: ExecutionStatus.RUNNING,
          startedAt: stepStartedAt.toISOString(),
        } as Partial<EsWorkflowStepExecution>;

        // Log step start using context manager
        this.contextManager?.logStepStart(stepId, stepName);

        await this.stepExecutionRepository.createStepExecution(stepExecution);
        this.stepExecutions.set(nodeId, stepExecution as EsWorkflowStepExecution);
      }
    );
  }

  public async finishStep(stepId: string): Promise<void> {
    return withSpan(
      {
        name: `workflow.step.${stepId}.complete`,
        type: 'workflow',
        subtype: 'step_completion',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.traceId,
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const startedStepExecution = this.stepExecutions.get(stepId);
        const stepResult: RunStepResult = this.stepResults.get(stepId) || {
          error: undefined,
          output: undefined,
        };

        if (!startedStepExecution) {
          throw new Error(`Step execution not found for step ID: ${stepId}`);
        }

        const stepStatus = stepResult.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED;
        const completedAt = new Date();
        const executionTimeMs =
          completedAt.getTime() - new Date(startedStepExecution.startedAt).getTime();
        const stepExecutionUpdate = {
          id: startedStepExecution.id,
          status: stepStatus,
          completedAt: completedAt.toISOString(),
          executionTimeMs,
          error: stepResult.error,
          output: stepResult.output,
        } as Partial<EsWorkflowStepExecution>;

        // Log step completion using context manager
        const success = !stepResult.error;
        const stepNode = this.workflowExecutionGraph.node(stepId) as any;
        const stepName = stepNode?.name || stepId;
        this.contextManager?.logStepComplete(stepId, stepName, success);

        await this.stepExecutionRepository.updateStepExecution(stepExecutionUpdate);
        this.stepExecutions.set(stepId, {
          ...startedStepExecution,
          ...stepExecutionUpdate,
        } as EsWorkflowStepExecution);

        await this.updateWorkflowState();

        // If the currentStepIndex has not explicitly changed (by a node), go to the next step
        if (this.currentStepIndex === this.topologicalOrder.indexOf(stepId)) {
          this.goToNextStep();
        }
      }
    );
  }

  public async skipSteps(stepIds: string[]): Promise<void> {
    const toSave = stepIds.map((stepId) => {
      const workflowStepExecutionId = `${this.workflowExecution.id}-${stepId}`;
      return {
        id: workflowStepExecutionId,
        workflowRunId: this.workflowExecution.id,
        stepId,
        topologicalIndex: 0, // TODO: this.topologicalOrder.indexOf(stepId),
        status: ExecutionStatus.SKIPPED,
      } as Partial<EsWorkflowStepExecution>;
    });

    await this.stepExecutionRepository.updateStepExecutions(toSave);
    toSave.forEach((stepExecution) => {
      this.stepExecutions.set(
        stepExecution.stepId as string,
        stepExecution as EsWorkflowStepExecution
      );
    });
  }

  public async start(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🚀 Starting workflow execution with APM tracing:', this.workflowExecution.id);
    // eslint-disable-next-line no-console
    console.log('🚀 Labels that will be set:', {
      workflow_execution_id: this.workflowExecution.id,
      workflow_id: this.workflowExecution.workflowId,
      trace_id: this.traceId,
      service_name: 'workflow-engine',
      transaction_type: 'workflow_execution',
    });

    return withSpan(
      {
        name: `workflow.execution.${this.workflowExecution.workflowId}`,
        type: 'workflow',
        subtype: 'execution',
        labels: {
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.traceId,
          service_name: 'workflow-engine',
          transaction_type: 'workflow_execution',
        },
      },
      async (span) => {
        // Store entry transaction ID from APM span (use span ID as fallback)
        if (span?.ids) {
          this.entryTransactionId = span.ids['span.id'] || this.workflowExecution.id;
        }

        // Capture the real APM trace ID
        let realTraceId: string | undefined;
        // eslint-disable-next-line no-console
        console.log('🔍 Available span properties:', span ? Object.keys(span) : 'No span');
        // eslint-disable-next-line no-console
        console.log('🔍 Span object:', span);

        if ((span as any)?.traceId) {
          realTraceId = (span as any).traceId;
          // eslint-disable-next-line no-console
          console.log('🎯 Captured APM trace ID from span.traceId:', realTraceId);
        } else if (span?.ids?.['trace.id']) {
          realTraceId = span.ids['trace.id'];
          // eslint-disable-next-line no-console
          console.log('🎯 Captured APM trace ID from span.ids[trace.id]:', realTraceId);
        } else {
          // eslint-disable-next-line no-console
          console.log('⚠️ Could not capture APM trace ID, using workflow execution ID as fallback');
          realTraceId = this.workflowExecution.id;
        }

        const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
          id: this.workflowExecution.id,
          status: ExecutionStatus.RUNNING,
          startedAt: new Date().toISOString(),
          workflowId: this.workflowExecution.workflowId,
          triggeredBy: this.workflowExecution.triggeredBy,
          traceId: realTraceId, // Store the real APM trace ID
        };
        await this.workflowExecutionRepository.updateWorkflowExecution(updatedWorkflowExecution);
        this.workflowExecution = {
          ...this.workflowExecution,
          ...updatedWorkflowExecution,
        };
      }
    );
  }

  public async fail(error: any): Promise<void> {
    return withSpan(
      {
        name: `workflow.execution.fail`,
        type: 'workflow',
        subtype: 'execution_failure',
        labels: {
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.traceId,
          service_name: 'workflow-engine',
          error_message: String(error),
        },
      },
      async () => {
        const currentStep = this.getCurrentStep();

        if (currentStep) {
          await this.setStepResult(currentStep.id, {
            output: undefined,
            error,
          });
        }

        const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
          id: this.workflowExecution.id,
          status: ExecutionStatus.FAILED,
          error: String(error),
          traceId: this.traceId, // Ensure traceId is set
        };
        await this.workflowExecutionRepository.updateWorkflowExecution(workflowExecutionUpdate);
        this.workflowExecution = {
          ...this.workflowExecution,
          ...workflowExecutionUpdate,
        };
      }
    );
  }

  private async updateWorkflowState(): Promise<void> {
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
      id: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      startedAt: this.workflowExecution.startedAt,
      triggeredBy: this.workflowExecution.triggeredBy,
      traceId: this.workflowExecution.traceId,
    };

    if (this.isWorkflowFinished()) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }
    const currentStepError = this.getCurrentStepError();

    if (currentStepError) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
      workflowExecutionUpdate.error = currentStepError;
    }

    if (
      [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
        workflowExecutionUpdate.status as ExecutionStatus
      )
    ) {
      const startedAt = new Date(this.workflowExecution.startedAt);
      const completeDate = new Date();
      workflowExecutionUpdate.finishedAt = completeDate.toISOString();
      workflowExecutionUpdate.duration = completeDate.getTime() - startedAt.getTime();
    }

    // TODO: Consider saving runtime state to workflow execution document

    await this.workflowExecutionRepository.updateWorkflowExecution(workflowExecutionUpdate);
    this.workflowExecution = {
      ...this.workflowExecution,
      ...workflowExecutionUpdate,
    };
  }

  private isWorkflowFinished(): boolean {
    if (this.currentStepIndex === this.topologicalOrder.length - 1) {
      return true;
    }

    return false;
  }

  private getCurrentStepError(): any | undefined {
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    const currentStepResult = this.getStepResult(currentStepId) || ({} as RunStepResult);

    if (currentStepResult.error) {
      return currentStepResult.error;
    }

    return undefined;
  }
}
