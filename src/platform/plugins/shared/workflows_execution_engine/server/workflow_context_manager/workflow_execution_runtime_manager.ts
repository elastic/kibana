/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution, StackEntry } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNode, WorkflowGraph } from '@kbn/workflows/graph';
import { withSpan } from '@kbn/apm-utils';
import agent from 'elastic-apm-node';
import type { RunStepResult } from '../step/node_implementation';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { buildStepExecutionId, buildStepPath } from '../utils';

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

  public getCurrentNode(): GraphNode {
    if (!this.workflowExecution.currentNodeId) {
      return null as any; // TODO: better handling
    }

    return this.workflowGraph.getNode(this.workflowExecution.currentNodeId as string);
  }

  public getCurrentStepExecutionId(): string {
    return buildStepExecutionId(
      this.workflowExecution.id,
      this.getCurrentNode().stepId,
      this.workflowExecution.stack
    );
  }

  public navigateToNode(nodeId: string): void {
    if (!this.workflowGraph.getNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this.workflowExecutionState.updateWorkflowExecution({
      currentNodeId: nodeId,
    });
  }

  public navigateToNextNode(): void {
    const currentNodeId = this.workflowExecution.currentNodeId;
    const currentNodeIndex = this.topologicalOrder.findIndex((nodeId) => nodeId === currentNodeId);
    if (currentNodeIndex < this.topologicalOrder.length - 1) {
      this.workflowExecutionState.updateWorkflowExecution({
        currentNodeId: this.topologicalOrder[currentNodeIndex + 1],
      });
      return;
    }

    this.workflowExecutionState.updateWorkflowExecution({
      currentNodeId: undefined,
    });
  }

  public getCurrentNodeScope(): StackEntry[] {
    return [...this.workflowExecution.stack];
  }

  public enterScope(subScopeId?: string): void {
    const currentNode = this.getCurrentNode();

    if (
      this.workflowExecution.stack.length &&
      this.workflowExecution.stack[this.workflowExecution.stack.length - 1].stepId ===
        currentNode.stepId
    ) {
      // Path 1: Extend existing stack entry (correct)
      const stackEntry = this.workflowExecution.stack[this.workflowExecution.stack.length - 1];
      this.workflowExecutionState.updateWorkflowExecution({
        stack: this.workflowExecution.stack.slice(0, -1).concat([
          {
            ...stackEntry,
            scope: [
              ...stackEntry.scope,
              {
                nodeId: currentNode.id,
                scopeId: subScopeId,
              },
            ],
          },
        ]),
      });
      return;
    }

    // Path 2: Create new stack entry (FIXED - removed slice(0, -1))
    this.workflowExecutionState.updateWorkflowExecution({
      stack: this.workflowExecution.stack.concat([
        // ✅ FIXED: Don't remove last entry
        {
          stepId: currentNode.stepId,
          scope: [
            {
              nodeId: currentNode.id,
              scopeId: subScopeId,
            },
          ],
        },
      ]),
    });
  }

  public exitScope(): void {
    const currentNode = this.getCurrentNode();

    if (
      this.workflowExecution.stack.length &&
      this.workflowExecution.stack.at(-1)!.stepId === currentNode.stepId &&
      this.workflowExecution.stack.at(-1)!.scope.length > 1
    ) {
      const stackEntry = this.workflowExecution.stack.at(-1)!;

      this.workflowExecutionState.updateWorkflowExecution({
        stack: this.workflowExecution.stack.slice(0, -1).concat([
          {
            ...stackEntry,
            scope: stackEntry.scope.slice(0, -1),
          },
        ]),
      });
      return;
    }

    this.workflowExecutionState.updateWorkflowExecution({
      stack: this.workflowExecution.stack.slice(0, -1),
    });
  }

  public setWorkflowError(error: Error | string | undefined): void {
    this.workflowExecutionState.updateWorkflowExecution({
      error: error ? String(error) : undefined,
    });
  }

  public getCurrentStepResult(): RunStepResult | undefined {
    const stepExecution = this.workflowExecutionState.getStepExecution(
      this.getCurrentStepExecutionId()
    );

    if (!stepExecution) {
      return undefined;
    }
    return {
      input: stepExecution.input || {},
      output: stepExecution.output || {},
      error: stepExecution.error,
    };
  }

  public async setCurrentStepResult(result: RunStepResult): Promise<void> {
    const currentNode = this.getCurrentNode();

    if (result.error) {
      this.setWorkflowError(result.error);
    }

    this.workflowExecutionState.upsertStep({
      id: this.getCurrentStepExecutionId(),
      stepId: currentNode.stepId,
      path: this.buildCurrentStepPath(),
      input: result.input,
      output: result.output,
      error: result.error,
    });
  }

  public getCurrentStepState(): Record<string, any> | undefined {
    const stepId = this.getCurrentNode().stepId;
    return this.workflowExecutionState.getStepExecution(this.getCurrentStepExecutionId())?.state;
  }

  public async setCurrentStepState(state: Record<string, any> | undefined): Promise<void> {
    const stepId = this.getCurrentNode().stepId;
    this.workflowExecutionState.upsertStep({
      id: this.getCurrentStepExecutionId(),
      stepId,
      path: this.buildCurrentStepPath(),
      state,
    });
  }

  public async startStep(): Promise<void> {
    const currentNode = this.getCurrentNode();
    const stepId = this.getCurrentNode().stepId;
    return withSpan(
      {
        name: `workflow.step.${stepId}`,
        type: 'workflow',
        subtype: 'step',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.getTraceId(), // Ensure consistent traceId
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const stepStartedAt = new Date();

        const stepExecution = {
          id: this.getCurrentStepExecutionId(),
          stepId: currentNode.stepId,
          stepType: currentNode.stepType,
          path: this.buildCurrentStepPath(),
          topologicalIndex: this.topologicalOrder.indexOf(currentNode.id),
          status: ExecutionStatus.RUNNING,
          startedAt: stepStartedAt.toISOString(),
        } as Partial<EsWorkflowStepExecution>;

        this.workflowExecutionState.upsertStep(stepExecution);
        this.logStepStart(stepId, stepExecution.id!);
        await this.workflowExecutionState.flushStepChanges();
      }
    );
  }

  public async finishStep(): Promise<void> {
    const stepId = this.getCurrentNode().stepId;
    const stepExecutionId = this.getCurrentStepExecutionId();
    const startedStepExecution = this.workflowExecutionState.getStepExecution(stepExecutionId);

    if (startedStepExecution?.error) {
      this.failStep(startedStepExecution.error);
      return;
    }

    return withSpan(
      {
        name: `workflow.step.${stepId}.complete`,
        type: 'workflow',
        subtype: 'step_completion',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.getTraceId(),
          service_name: 'workflow-engine',
        },
      },
      async () => {
        const stepExecutionUpdate = {
          id: stepExecutionId,
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date().toISOString(),
        } as Partial<EsWorkflowStepExecution>;

        if (startedStepExecution?.startedAt) {
          stepExecutionUpdate.executionTimeMs =
            new Date(stepExecutionUpdate.completedAt as string).getTime() -
            new Date(startedStepExecution.startedAt).getTime();
        }

        this.workflowExecutionState.upsertStep(stepExecutionUpdate);
        this.logStepComplete(stepExecutionUpdate);
      }
    );
  }

  public async failStep(error: Error | string): Promise<void> {
    const stepId = this.getCurrentNode().stepId;
    return withSpan(
      {
        name: `workflow.step.${stepId}.fail`,
        type: 'workflow',
        subtype: 'step_failure',
        labels: {
          workflow_step_id: stepId,
          workflow_execution_id: this.workflowExecution.id,
          workflow_id: this.workflowExecution.workflowId,
          trace_id: this.getTraceId(),
          service_name: 'workflow-engine',
        },
      },
      async () => {
        // if there is a last step execution, fail it
        // if not, create a new step execution with fail
        const startedStepExecution = this.workflowExecutionState.getStepExecution(
          this.getCurrentStepExecutionId()
        );
        const stepExecutionUpdate = {
          id: this.getCurrentStepExecutionId(),
          stepId,
          path: this.buildCurrentStepPath(),
          status: ExecutionStatus.FAILED,
          completedAt: new Date().toISOString(),
          output: null,
          error: String(error),
        } as Partial<EsWorkflowStepExecution>;

        if (startedStepExecution && startedStepExecution.startedAt) {
          stepExecutionUpdate.executionTimeMs =
            new Date(stepExecutionUpdate.completedAt as string).getTime() -
            new Date(startedStepExecution.startedAt).getTime();
        }
        this.workflowExecutionState.updateWorkflowExecution({
          error: String(error),
        });
        this.workflowExecutionState.upsertStep(stepExecutionUpdate);
        this.logStepFail(stepExecutionUpdate.id!, error);
      }
    );
  }

  public async setWaitStep(): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const stepId = this.getCurrentNode().stepId;
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
          id: this.getCurrentStepExecutionId(),
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

    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      currentNodeId: this.topologicalOrder[0],
      stack: [],
      status: ExecutionStatus.RUNNING,
      startedAt: new Date().toISOString(),
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
    this.logWorkflowStart();
    await this.workflowExecutionState.flush();
  }

  public async resume(): Promise<void> {
    await this.workflowExecutionState.load();
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      status: ExecutionStatus.RUNNING,
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
  }

  public async saveState(): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {};
    if (!workflowExecution.currentNodeId) {
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

  private buildCurrentStepPath(): string[] {
    const path = buildStepPath(this.getCurrentNode().stepId, this.workflowExecution.stack);

    return path;
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
      labels: {
        step_type: this.getCurrentNode().stepType,
        connector_type: this.getCurrentNode().stepType,
        step_name: this.getCurrentNode().stepId,
        step_id: stepId,
      },
    });
  }

  private logStepComplete(step: Partial<EsWorkflowStepExecution>): void {
    const isSuccess = step?.status === ExecutionStatus.COMPLETED;
    const stepId = this.getCurrentNode().stepId;
    this.workflowLogger?.logInfo(`Step '${stepId}' ${isSuccess ? 'completed' : 'failed'}`, {
      workflow: { step_id: stepId, step_execution_id: step.id },
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
      labels: {
        step_type: this.getCurrentNode().stepType,
        connector_type: this.getCurrentNode().stepType,
        step_name: this.getCurrentNode().stepId,
        step_id: this.getCurrentNode().stepId,
        execution_time_ms: step.executionTimeMs,
      },
      ...(step.error && {
        error: {
          message:
            typeof step.error === 'string'
              ? step.error
              : (step.error as Error)?.message || 'Unknown error',
          type:
            typeof step.error === 'string'
              ? 'WorkflowStepError'
              : (step.error as Error)?.name || 'Error',
          stack_trace: typeof step.error === 'string' ? undefined : (step.error as Error)?.stack,
        },
      }),
    });
  }

  private logStepFail(stepExecutionId: string, error: Error | string): void {
    const node = this.getCurrentNode();
    const stepName = node.stepId;
    const stepType = node.stepType || 'unknown';
    const _error = typeof error === 'string' ? Error(error) : error;

    // Include error message in the log message
    const errorMsg = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const message = `Step '${stepName}' failed: ${errorMsg}`;

    this.workflowLogger?.logError(message, _error, {
      workflow: { step_id: node.stepId, step_execution_id: stepExecutionId },
      event: { action: 'step-fail', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'fail'],
      labels: {
        step_type: stepType,
        connector_type: stepType,
        step_name: stepName,
        step_id: node.stepId,
      },
    });
  }
}
