/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution, GraphNode } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { withSpan } from '@kbn/apm-utils';
import agent from 'elastic-apm-node';
import type { RunStepResult } from '../step/step_base';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowExecutionState } from './workflow_execution_state';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecutionState: WorkflowExecutionState;
  workflowExecution: EsWorkflowExecution;
  workflowExecutionGraph: WorkflowGraph;
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
  private currentStepIndex: number = -1;
  private workflowLogger: IWorkflowEventLogger | null = null;

  private workflowExecutionState: WorkflowExecutionState;
  private entryTransactionId?: string;
  private workflowTransaction?: any; // APM transaction instance
  private workflowGraph: WorkflowGraph;

  private get topologicalOrder(): string[] {
    return this.workflowGraph.topologicalOrder;
  }

  constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit) {
    this.workflowGraph = workflowExecutionRuntimeManagerInit.workflowExecutionGraph;

    // Use workflow execution ID as traceId for APM compatibility
    this.workflowLogger = workflowExecutionRuntimeManagerInit.workflowLogger;
    this.workflowExecutionState = workflowExecutionRuntimeManagerInit.workflowExecutionState;
  }

  public get workflowExecution() {
    return this.workflowExecutionState.getWorkflowExecution();
  }

  /**
   * Get the APM trace ID for this workflow execution
   */
  public getTraceId(): string {
    return this.getWorkflowExecution().id;
  }

  /**
   * Get the entry transaction ID (main workflow transaction)
   */
  public getEntryTransactionId(): string | undefined {
    return this.entryTransactionId;
  }

  public getWorkflowExecutionStatus(): ExecutionStatus {
    return this.workflowExecutionState.getWorkflowExecution().status;
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecutionState.getWorkflowExecution();
  }

  public getCurrentStepExecutionId(): string {
    const currentStep = this.getCurrentStep();
    return this.buildStepExecutionId(currentStep.id);
  }

  // TODO: To rename to getCurrentNode and use proper type
  public getCurrentStep(): GraphNode {
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    return this.workflowGraph.getNode(currentStepId);
  }

  // TODO: To rename to goToNode
  public goToStep(stepId: string): void {
    this.currentStepIndex = this.topologicalOrder.findIndex((id) => id === stepId);
  }

  // TODO: To rename to goToNextNode
  public goToNextStep(): void {
    if (this.currentStepIndex < this.topologicalOrder.length - 1) {
      this.currentStepIndex++;
      return;
    }

    this.currentStepIndex = -1;
  }

  public enterScope(scopeId?: string): void {
    if (!scopeId) {
      scopeId = this.getCurrentStep().id;
    }

    const stack = [...this.workflowExecutionState.getWorkflowExecution().stack];
    stack.push(scopeId as string);
    this.workflowExecutionState.updateWorkflowExecution({
      stack,
    });
  }

  public exitScope(): void {
    const stack = [...this.workflowExecutionState.getWorkflowExecution().stack];
    stack.pop();
    this.workflowExecutionState.updateWorkflowExecution({
      stack,
    });
  }

  public setWorkflowError(error: Error | string | undefined): void {
    this.workflowExecutionState.updateWorkflowExecution({
      error: error ? String(error) : undefined,
    });
  }

  public getStepResult(stepId: string): RunStepResult | undefined {
    const latestStepExecution = this.workflowExecutionState.getLatestStepExecution(stepId);

    if (!latestStepExecution) {
      return undefined;
    }
    return {
      input: latestStepExecution.input || {},
      output: latestStepExecution.output || {},
      error: latestStepExecution.error,
    };
  }

  public async setStepResult(result: RunStepResult): Promise<void> {
    const currentStep = this.getCurrentStep();

    if (result.error) {
      this.setWorkflowError(result.error);
    }

    this.workflowExecutionState.upsertStep({
      id: this.getCurrentStepExecutionId(),
      stepId: currentStep.id,
      path: [...(this.workflowExecutionState.getWorkflowExecution().stack || [])],
      input: result.input,
      output: result.output,
      error: result.error,
    });
  }

  public getStepState(stepId: string): Record<string, any> | undefined {
    return this.workflowExecutionState.getLatestStepExecution(stepId)?.state;
  }

  public async setStepState(stepId: string, state: Record<string, any> | undefined): Promise<void> {
    this.workflowExecutionState.upsertStep({
      id: this.buildStepExecutionId(stepId),
      path: [...(this.workflowExecutionState.getWorkflowExecution().stack || [])],
      stepId,
      state,
    });
  }

  public async startStep(stepId: string): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    return withSpan(
      {
        name: `workflow.step.${stepId}`,
        type: 'workflow',
        subtype: 'step',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: workflowExecution.id,
          workflow_id: workflowExecution.workflowId,
          trace_id: this.getTraceId(), // Ensure consistent traceId
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const nodeId = stepId;
        const node = this.workflowGraph.getNode(nodeId);
        const stepStartedAt = new Date();

        const stepExecution = {
          id: this.buildStepExecutionId(stepId),
          stepId: nodeId,
          stepType: (node as any)?.configuration.type,
          path: [...(workflowExecution.stack || [])],
          topologicalIndex: this.topologicalOrder.findIndex((id) => id === stepId),
          status: ExecutionStatus.RUNNING,
          startedAt: stepStartedAt.toISOString(),
        } as Partial<EsWorkflowStepExecution>;

        this.workflowExecutionState.upsertStep(stepExecution);
        this.logStepStart(stepId, stepExecution.id!);
        await this.workflowExecutionState.flush();
      }
    );
  }

  public async finishStep(stepId: string): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    return withSpan(
      {
        name: `workflow.step.${stepId}.complete`,
        type: 'workflow',
        subtype: 'step_completion',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: workflowExecution.id,
          workflow_id: workflowExecution.workflowId,
          trace_id: this.getTraceId(),
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const startedStepExecution = this.workflowExecutionState.getLatestStepExecution(stepId);

        if (!startedStepExecution) {
          throw new Error(`WorkflowRuntime: Step execution not found for step ID: ${stepId}`);
        }

        const stepStatus = startedStepExecution.error
          ? ExecutionStatus.FAILED
          : ExecutionStatus.COMPLETED;
        const completedAt = new Date();
        const executionTimeMs =
          completedAt.getTime() - new Date(startedStepExecution.startedAt).getTime();
        const stepExecutionUpdate = {
          id: this.buildStepExecutionId(stepId),
          path: [...(this.workflowExecutionState.getWorkflowExecution().stack || [])],
          stepId: startedStepExecution.stepId,
          status: stepStatus,
          completedAt: completedAt.toISOString(),
          executionTimeMs,
          error: startedStepExecution.error,
          output: startedStepExecution.output,
          input: startedStepExecution.input,
        } as Partial<EsWorkflowStepExecution>;

        this.workflowExecutionState.upsertStep(stepExecutionUpdate);
        this.logStepComplete(stepExecutionUpdate);
      }
    );
  }

  public async failStep(stepId: string, error: Error | string): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    return withSpan(
      {
        name: `workflow.step.${stepId}.fail`,
        type: 'workflow',
        subtype: 'step_failure',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: workflowExecution.id,
          workflow_id: workflowExecution.workflowId,
          trace_id: this.getTraceId(),
          service_name: 'workflow-engine',
        },
      },
      async () => {
        // if there is a last step execution, fail it
        // if not, create a new step execution with fail
        const stepExecutionUpdate = {
          id: this.buildStepExecutionId(stepId),
          path: [...(this.workflowExecutionState.getWorkflowExecution().stack || [])],
          stepId,
          status: ExecutionStatus.FAILED,
          output: null,
          error: String(error),
        } as Partial<EsWorkflowStepExecution>;

        this.workflowExecutionState.upsertStep(stepExecutionUpdate);
        this.logStepFail(stepId, stepExecutionUpdate.id!, error);
      }
    );
  }

  public async setWaitStep(stepId: string): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();

    return withSpan(
      {
        name: `workflow.step.${stepId}.delayed`,
        type: 'workflow',
        subtype: 'step_delayed',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: workflowExecution.id,
          workflow_id: workflowExecution.workflowId,
          trace_id: this.getTraceId(),
          service_name: 'workflow-engine',
        },
      },
      async () => {
        this.workflowExecutionState.upsertStep({
          id: this.buildStepExecutionId(stepId),
          path: [...(this.workflowExecutionState.getWorkflowExecution().stack || [])],
          stepId,
          status: ExecutionStatus.WAITING,
        });

        this.workflowExecutionState.updateWorkflowExecution({
          status: ExecutionStatus.WAITING,
        });
      }
    );
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

          this.workflowExecutionState.updateWorkflowExecution({
            entryTransactionId: workflowTransactionId,
          });

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
          this.workflowExecutionState.updateWorkflowExecution({
            traceId: realTraceId,
          });
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

          this.workflowExecutionState.updateWorkflowExecution({
            entryTransactionId: taskTransactionId,
          });

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
          this.workflowExecutionState.updateWorkflowExecution({
            traceId: realTraceId,
          });
        }
      }

      // Set the transaction outcome to success by default
      // It will be overridden if the workflow fails
      existingTransaction.outcome = 'success';
    } else {
      // Fallback if no task transaction exists - proceed without tracing
      this.workflowLogger?.logWarn(
        'No active Task Manager transaction found, proceeding without APM tracing'
      );
    }

    this.currentStepIndex = 0;

    if (this.currentStepIndex >= this.topologicalOrder.length) {
      throw new Error('Workflow has no steps to execute');
    }

    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      stack: [],
      status: ExecutionStatus.RUNNING,
      currentNodeId: this.topologicalOrder[this.currentStepIndex],
      startedAt: new Date().toISOString(),
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
    this.logWorkflowStart();
    await this.workflowExecutionState.flush();
  }

  public async resume(): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    this.currentStepIndex = this.topologicalOrder.findIndex(
      (nodeId) => nodeId === workflowExecution.currentNodeId
    );
    await this.workflowExecutionState.load();
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      status: ExecutionStatus.RUNNING,
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
  }

  public async saveState(): Promise<void> {
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
      currentNodeId: this.getCurrentStep()?.id,
    };
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const currentStep = this.getCurrentStep();

    if (!currentStep) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }

    if (workflowExecution.error) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
    }

    if (
      [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
        workflowExecutionUpdate.status as ExecutionStatus
      )
    ) {
      const startedAt = new Date(workflowExecution.startedAt);
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

    this.workflowExecutionState.updateWorkflowExecution(workflowExecutionUpdate);
    await this.workflowExecutionState.flush();
  }

  /** Since we have execution stack, we can build a unique execution ID for each step based on it */
  public buildStepExecutionId(stepId: string): string {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const path: string[] = [];

    for (const part of workflowExecution.stack) {
      // If the provided stepId is part of the stack, use read path until its position and stop
      if (part === stepId) {
        break;
      }

      path.push(part);
    }

    return [workflowExecution.id, ...path, stepId].join('_');
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

  private logStepStart(stepId: string, stepExecutionId: string): void {
    this.workflowLogger?.logInfo(`Step '${stepId}' started`, {
      workflow: { step_id: stepId, step_execution_id: stepExecutionId },
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
    });
  }

  private logStepComplete(step: Partial<EsWorkflowStepExecution>): void {
    const isSuccess = step?.status === ExecutionStatus.COMPLETED;
    this.workflowLogger?.logInfo(`Step '${step.stepId}' ${isSuccess ? 'completed' : 'failed'}`, {
      workflow: { step_id: step.stepId, step_execution_id: step.id },
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
    });
  }

  private logStepFail(stepId: string, stepExecutionId: string, error: Error | string): void {
    const _error = typeof error === 'string' ? Error(error) : error;
    this.workflowLogger?.logError(`Step '${stepId}' failed`, _error, {
      workflow: { step_id: stepId, step_execution_id: stepExecutionId },
      event: { action: 'step-fail', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'fail'],
    });
  }
}
