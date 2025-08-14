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
import agent from 'elastic-apm-node';
import { RunStepResult } from '../step/step_base';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecution: EsWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  workflowExecutionGraph: graphlib.Graph;
  workflowLogger: IWorkflowEventLogger;
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
  // private contextManager?: IWorkflowContextLogger;
  private workflowLogger: IWorkflowEventLogger | null = null;

  // APM trace properties - consistent traceId for entire workflow execution
  private readonly traceId: string;
  private entryTransactionId?: string;
  private workflowTransaction?: any; // APM transaction instance

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
    this.workflowLogger = workflowExecutionRuntimeManagerInit.workflowLogger;
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

  public getNodeSuccessors(nodeId: string): any[] {
    const successors = this.workflowExecutionGraph.successors(nodeId);

    if (!successors) {
      return [];
    }

    return successors.map((successorId) => this.workflowExecutionGraph.node(successorId)) as any[];
  }

  // TODO: To rename to getCurrentNode and use proper type
  public getCurrentStep(): any {
    // must be a proper type
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.topologicalOrder.length) {
      return null; // No current step
    }
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    return this.workflowExecutionGraph.node(currentStepId);
  }

  // TODO: To rename to goToNode
  public goToStep(stepId: string): void {
    this.currentStepIndex = this.topologicalOrder.findIndex((id) => id === stepId);
  }

  // TODO: To rename to goToNextNode
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

        const stepExecution = {
          id: workflowStepExecutionId,
          workflowId, // Replace with actual workflow ID
          workflowRunId,
          stepId: nodeId,
          topologicalIndex: this.topologicalOrder.findIndex((id) => id === stepId),
          status: ExecutionStatus.RUNNING,
          startedAt: stepStartedAt.toISOString(),
        } as Partial<EsWorkflowStepExecution>;

        await this.stepExecutionRepository.createStepExecution(stepExecution);
        this.stepExecutions.set(nodeId, stepExecution as EsWorkflowStepExecution);
        this.logStepStart(stepId);
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

        await this.stepExecutionRepository.updateStepExecution(stepExecutionUpdate);
        this.stepExecutions.set(stepId, {
          ...startedStepExecution,
          ...stepExecutionUpdate,
        } as EsWorkflowStepExecution);
        this.logStepComplete(stepId);

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
        topologicalIndex: this.topologicalOrder.indexOf(stepId),
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
    this.workflowLogger?.logInfo('Starting workflow execution with APM tracing', {
      workflow: { execution_id: this.workflowExecution.id },
    });

    const existingTransaction = agent.currentTransaction;

    if (existingTransaction) {
      // Check if this is triggered by alerting (has alerting labels) or task manager directly
      const isTriggeredByAlerting = !!(existingTransaction as any)._labels?.alerting_rule_id;

      this.workflowLogger?.logDebug('Found existing transaction context', {
        transaction: {
          name: existingTransaction.name,
          type: existingTransaction.type,
          is_triggered_by_alerting: isTriggeredByAlerting,
          alerting_rule_id: (existingTransaction as any)._labels?.alerting_rule_id,
          transaction_id: existingTransaction.ids?.['transaction.id'],
        },
      });

      if (isTriggeredByAlerting) {
        // For alerting-triggered workflows, create a dedicated workflow transaction
        // This provides a focused view for the embeddable instead of the entire alerting trace
        this.workflowLogger?.logInfo(
          'Creating dedicated workflow transaction within alerting trace'
        );

        const workflowTransaction = agent.startTransaction(
          `workflow.execution.${this.workflowExecution.workflowId}`,
          'workflow_execution'
        );

        this.workflowTransaction = workflowTransaction;

        // Add workflow-specific labels
        workflowTransaction.addLabels({
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          service_name: 'kibana',
          transaction_hierarchy: 'alerting->workflow->steps',
          triggered_by: 'alerting',
          parent_alerting_rule_id: (existingTransaction as any)._labels?.alerting_rule_id,
        });

        // Make the workflow transaction the current transaction for subsequent spans
        (agent as any).setCurrentTransaction(workflowTransaction);

        // Store the workflow transaction ID (not the alerting transaction ID)
        const workflowTransactionId = workflowTransaction.ids?.['transaction.id'];
        if (workflowTransactionId) {
          this.workflowLogger?.logDebug('Storing workflow transaction ID', {
            transaction: { workflow_transaction_id: workflowTransactionId },
          });

          await this.workflowExecutionRepository.updateWorkflowExecution({
            id: this.workflowExecution.id,
            entryTransactionId: workflowTransactionId,
          });

          this.workflowExecution = {
            ...this.workflowExecution,
            entryTransactionId: workflowTransactionId,
          };

          this.workflowLogger?.logDebug('Workflow transaction ID stored in workflow execution');
        }

        // Capture trace ID from the workflow transaction
        let realTraceId: string | undefined;
        if ((workflowTransaction as any)?.traceId) {
          realTraceId = (workflowTransaction as any).traceId;
        } else if (workflowTransaction.ids?.['trace.id']) {
          realTraceId = workflowTransaction.ids['trace.id'];
        } else if ((workflowTransaction as any)?.trace?.id) {
          realTraceId = (workflowTransaction as any).trace.id;
        }

        if (realTraceId) {
          this.workflowLogger?.logDebug('Captured APM trace ID from workflow transaction', {
            trace: { trace_id: realTraceId },
          });
          await this.workflowExecutionRepository.updateWorkflowExecution({
            id: this.workflowExecution.id,
            traceId: realTraceId,
          });

          this.workflowExecution = {
            ...this.workflowExecution,
            traceId: realTraceId,
          };
        }
      } else {
        // For task manager triggered workflows, reuse the existing transaction
        this.workflowLogger?.logInfo('Reusing task manager transaction for workflow execution');

        this.workflowTransaction = existingTransaction;

        // Add workflow-specific labels to the existing transaction
        existingTransaction.addLabels({
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          service_name: 'kibana',
          transaction_hierarchy: 'task->steps',
          triggered_by: 'task_manager',
        });

        // Store the task transaction ID in the workflow execution
        const taskTransactionId = existingTransaction.ids?.['transaction.id'];
        if (taskTransactionId) {
          this.workflowLogger?.logDebug('Storing task transaction ID', {
            transaction: { task_transaction_id: taskTransactionId },
          });

          await this.workflowExecutionRepository.updateWorkflowExecution({
            id: this.workflowExecution.id,
            entryTransactionId: taskTransactionId,
          });

          this.workflowExecution = {
            ...this.workflowExecution,
            entryTransactionId: taskTransactionId,
          };

          this.workflowLogger?.logDebug('Task transaction ID stored in workflow execution');
        }

        // Capture trace ID from the task transaction
        let realTraceId: string | undefined;
        if ((existingTransaction as any)?.traceId) {
          realTraceId = (existingTransaction as any).traceId;
        } else if (existingTransaction.ids?.['trace.id']) {
          realTraceId = existingTransaction.ids['trace.id'];
        } else if ((existingTransaction as any)?.trace?.id) {
          realTraceId = (existingTransaction as any).trace.id;
        }

        if (realTraceId) {
          this.workflowLogger?.logDebug('Captured APM trace ID from task transaction', {
            trace: { trace_id: realTraceId },
          });
          await this.workflowExecutionRepository.updateWorkflowExecution({
            id: this.workflowExecution.id,
            traceId: realTraceId,
          });

          this.workflowExecution = {
            ...this.workflowExecution,
            traceId: realTraceId,
          };
        }
      }

      const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
        id: this.workflowExecution.id,
        status: ExecutionStatus.RUNNING,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowExecution.workflowId,
        triggeredBy: this.workflowExecution.triggeredBy,
      };
      await this.workflowExecutionRepository.updateWorkflowExecution(updatedWorkflowExecution);
      this.workflowExecution = {
        ...this.workflowExecution,
        ...updatedWorkflowExecution,
      };

      // Set the transaction outcome to success by default
      // It will be overridden if the workflow fails
      existingTransaction.outcome = 'success';
    } else {
      // Fallback if no task transaction exists - proceed without tracing
      this.workflowLogger?.logWarn(
        'No active Task Manager transaction found, proceeding without APM tracing'
      );
      const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
        id: this.workflowExecution.id,
        status: ExecutionStatus.RUNNING,
        startedAt: new Date().toISOString(),
        workflowId: this.workflowExecution.workflowId,
        triggeredBy: this.workflowExecution.triggeredBy,
        traceId: this.workflowExecution.id, // Use workflow execution ID as fallback
      };
      await this.workflowExecutionRepository.updateWorkflowExecution(updatedWorkflowExecution);
      this.workflowExecution = {
        ...this.workflowExecution,
        ...updatedWorkflowExecution,
      };
      this.logWorkflowStart();
    }
    // Note: Transaction will be ended by Task Manager when the task completes
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

        // Update the workflow transaction outcome on failure
        if (this.workflowTransaction) {
          this.workflowTransaction.outcome = 'failure';

          // For alerting-triggered workflows, we created a dedicated transaction and need to end it
          const isTriggeredByAlerting = this.workflowTransaction.type === 'workflow_execution';
          if (isTriggeredByAlerting) {
            this.workflowTransaction.end();
            this.workflowLogger?.logDebug(
              'Workflow transaction ended with failure outcome (alerting-triggered)'
            );
          } else {
            // For task manager triggered workflows, Task Manager will handle ending
            this.workflowLogger?.logDebug(
              'Task transaction outcome updated to failure (task manager will end)'
            );
          }
        }
      }
    );
  }

  private async updateWorkflowState(error?: any): Promise<void> {
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
    const workflowError = error || this.getCurrentStepError();

    if (workflowError) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
      workflowExecutionUpdate.error = workflowError;
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
      this.logWorkflowComplete(workflowExecutionUpdate.status === ExecutionStatus.COMPLETED);

      // Update the workflow transaction outcome when workflow completes
      if (this.workflowTransaction) {
        const isSuccess = workflowExecutionUpdate.status === ExecutionStatus.COMPLETED;
        this.workflowTransaction.outcome = isSuccess ? 'success' : 'failure';

        // For alerting-triggered workflows, we created a dedicated transaction and need to end it
        const isTriggeredByAlerting = this.workflowTransaction.type === 'workflow_execution';
        if (isTriggeredByAlerting) {
          this.workflowTransaction.end();
          this.workflowLogger?.logDebug('Workflow transaction ended (alerting-triggered)', {
            transaction: { outcome: this.workflowTransaction.outcome },
          });
        } else {
          // For task manager triggered workflows, Task Manager will handle ending
          this.workflowLogger?.logDebug(
            'Task transaction outcome updated (task manager will end)',
            {
              transaction: { outcome: this.workflowTransaction.outcome },
            }
          );
        }
      }
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

  private logWorkflowStart(): void {
    this.workflowLogger?.logInfo('Workflow execution started', {
      event: { action: 'workflow-start', category: ['workflow'] },
      tags: ['workflow', 'execution', 'start'],
    });
  }

  private logWorkflowComplete(success: boolean): void {
    this.workflowLogger?.logInfo(
      `Workflow execution ${success ? 'completed successfully' : 'failed'}`,
      {
        event: {
          action: 'workflow-complete',
          category: ['workflow'],
          outcome: success ? 'success' : 'failure',
        },
        tags: ['workflow', 'execution', 'complete'],
      }
    );
  }

  private logStepStart(stepId: string): void {
    const node = this.workflowExecutionGraph.node(stepId) as any;
    const stepName = node?.name || stepId;
    this.workflowLogger?.logInfo(`Step '${stepName}' started`, {
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
    });
  }

  private logStepComplete(stepId: string): void {
    const node = this.workflowExecutionGraph.node(stepId) as any;
    const stepName = node?.name || stepId;
    const workflowStep = this.stepExecutions.get(stepId);
    const isSuccess = workflowStep?.status === ExecutionStatus.COMPLETED;
    this.workflowLogger?.logInfo(`Step '${stepName}' ${isSuccess ? 'completed' : 'failed'}`, {
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
    });
  }
}
