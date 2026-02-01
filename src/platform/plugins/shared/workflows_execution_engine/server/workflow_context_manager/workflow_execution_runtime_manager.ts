/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments
/* eslint-disable @typescript-eslint/no-explicit-any */

import agent from 'elastic-apm-node';
import type { CoreStart } from '@kbn/core/server';
import type { EsWorkflowExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { buildWorkflowContext } from './build_workflow_context';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecutionState: WorkflowExecutionState;
  workflowExecution: EsWorkflowExecution;
  workflowExecutionGraph: WorkflowGraph;
  workflowLogger: IWorkflowEventLogger;
  coreStart?: CoreStart;
  dependencies?: ContextDependencies;
  telemetryClient?: WorkflowExecutionTelemetryClient;
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
  private nextNodeId: string | undefined;
  private coreStart?: CoreStart;
  private dependencies?: ContextDependencies;
  private telemetryClient?: WorkflowExecutionTelemetryClient;
  private telemetryReported: boolean = false;
  private get topologicalOrder(): string[] {
    return this.workflowGraph.topologicalOrder;
  }

  constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit) {
    this.workflowGraph = workflowExecutionRuntimeManagerInit.workflowExecutionGraph;

    // Use workflow execution ID as traceId for APM compatibility
    this.workflowLogger = workflowExecutionRuntimeManagerInit.workflowLogger;
    this.workflowExecutionState = workflowExecutionRuntimeManagerInit.workflowExecutionState;
    this.coreStart = workflowExecutionRuntimeManagerInit.coreStart;
    this.dependencies = workflowExecutionRuntimeManagerInit.dependencies;
    this.telemetryClient = workflowExecutionRuntimeManagerInit.telemetryClient;
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

  public getCurrentNode(): GraphNodeUnion | null {
    if (!this.workflowExecution.currentNodeId) {
      return null;
    }

    return this.workflowGraph.getNode(this.workflowExecution.currentNodeId as string);
  }

  public navigateToNode(nodeId: string): void {
    if (!this.workflowGraph.getNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this.nextNodeId = nodeId;
  }

  public navigateToNextNode(): void {
    const currentNodeId = this.workflowExecution.currentNodeId;
    const currentNodeIndex = this.topologicalOrder.findIndex((nodeId) => nodeId === currentNodeId);
    if (currentNodeIndex < this.topologicalOrder.length - 1) {
      this.nextNodeId = this.topologicalOrder[currentNodeIndex + 1];
      return;
    }
    this.nextNodeId = undefined;
  }

  public getCurrentNodeScope(): StackFrame[] {
    return [...this.workflowExecution.scopeStack];
  }

  /**
   * Enters a new scope in the workflow execution context.
   *
   * This method creates a new scope frame and pushes it onto the scope stack, establishing
   * a new execution context for nested workflow operations. Scopes are used to track
   * hierarchical execution contexts such as loops, conditionals, or sub-workflows.
   *
   * @param subScopeId - Optional identifier for the sub-scope being entered
   *
   * @remarks
   * This method includes a guard condition that prevents scope entry if the current node
   * is not an appropriate "enter" node. The scope update will be silently ignored if:
   * - The current node type does not start with 'enter' (e.g., 'enter-foreach', 'enter-if', etc)
   *
   * This guard ensures that scopes are only created at the correct workflow execution points,
   * maintaining the integrity of the execution context hierarchy.
   */
  public enterScope(subScopeId?: string): void {
    const currentNode = this.getCurrentNode();

    if (!currentNode?.type.startsWith('enter-')) {
      return;
    }

    this.workflowExecutionState.updateWorkflowExecution({
      scopeStack: WorkflowScopeStack.fromStackFrames(this.workflowExecution.scopeStack).enterScope({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        stepId: currentNode.stepId,
        scopeId: subScopeId,
      }).stackFrames,
    });
  }

  /**
   * Exits the current scope in the workflow execution context.
   *
   * This method pops the top scope frame from the scope stack, returning to the previous
   * execution context. This is typically called when leaving nested workflow operations
   * such as loops, conditionals, or sub-workflows.
   *
   * @remarks
   * This method includes multiple guard conditions that prevent scope exit if the current
   * execution state is not appropriate. The scope update will be silently ignored if:
   * - The current node type does not start with 'exit' (e.g., 'exit-foreach', 'exit-if', etc)
   * - The current node's corresponding enter type doesn't match the current scope's node type
   *   (e.g., trying to exit a loop scope from a conditional exit node)
   *
   * These guards ensure that scopes are only exited at the correct workflow execution points
   * and maintain proper nesting hierarchy, preventing scope stack corruption and ensuring
   * the integrity of the execution context.
   */
  public exitScope(): void {
    const currentNode = this.getCurrentNode();

    if (!currentNode?.type.startsWith('exit-')) {
      return;
    }

    const scopeStack = WorkflowScopeStack.fromStackFrames(this.workflowExecution.scopeStack);
    const entered = currentNode.type.replace(/^exit-/, 'enter-');

    if (entered !== scopeStack.getCurrentScope()?.nodeType) {
      return;
    }

    this.workflowExecutionState.updateWorkflowExecution({
      scopeStack: WorkflowScopeStack.fromStackFrames(this.workflowExecution.scopeStack).exitScope()
        .stackFrames,
    });
  }

  public setWorkflowError(error: Error | undefined): void {
    const executionError = error ? ExecutionError.fromError(error) : undefined;
    this.workflowExecutionState.updateWorkflowExecution({
      error: executionError ? executionError.toSerializableObject() : undefined,
    });
  }

  public markWorkflowTimeouted(): void {
    const finishedAt = new Date().toISOString();
    this.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.TIMED_OUT,
      finishedAt,
      duration:
        new Date(finishedAt).getTime() - new Date(this.workflowExecution.startedAt).getTime(),
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

    this.nextNodeId = this.topologicalOrder[0];
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      currentNodeId: this.nextNodeId,
      scopeStack: [],
      status: ExecutionStatus.RUNNING,
      startedAt: new Date().toISOString(),
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
    this.logWorkflowStart();
    await this.workflowExecutionState.flush();
  }

  public async resume(): Promise<void> {
    await this.workflowExecutionState.load();
    this.nextNodeId = this.workflowExecution.currentNodeId;
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      status: ExecutionStatus.RUNNING,
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
  }

  public async saveState(): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
      currentNodeId: this.nextNodeId,
    };
    if (!this.nextNodeId) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }

    if (workflowExecution.error) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
    }

    if (
      (workflowExecutionUpdate.status && isTerminalStatus(workflowExecutionUpdate.status)) ||
      isTerminalStatus(workflowExecution.status)
    ) {
      const startedAt = new Date(workflowExecution.startedAt);
      const finishDate = new Date();
      workflowExecutionUpdate.finishedAt = finishDate.toISOString();
      workflowExecutionUpdate.duration = finishDate.getTime() - startedAt.getTime();
      workflowExecutionUpdate.context = buildWorkflowContext(
        this.workflowExecution,
        this.coreStart,
        this.dependencies
      );
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

      // Report telemetry for terminal status (only once)
      this.reportTelemetryIfTerminal(workflowExecution, workflowExecutionUpdate);
    }

    this.workflowExecutionState.updateWorkflowExecution(workflowExecutionUpdate);
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

  /**
   * Reports telemetry for workflow execution when it reaches a terminal status.
   * Only reports once per execution to avoid duplicate events.
   */
  private reportTelemetryIfTerminal(
    workflowExecution: EsWorkflowExecution,
    workflowExecutionUpdate: Partial<EsWorkflowExecution>
  ): void {
    const finalStatus = workflowExecutionUpdate.status || workflowExecution.status;
    if (!this.telemetryClient || this.telemetryReported || !isTerminalStatus(finalStatus)) {
      return;
    }

    this.telemetryReported = true;
    const stepExecutions = this.workflowExecutionState.getAllStepExecutions();
    const finalWorkflowExecution = {
      ...workflowExecution,
      ...workflowExecutionUpdate,
      status: finalStatus,
    } as EsWorkflowExecution;

    this.telemetryClient.reportWorkflowExecutionTerminated({
      workflowExecution: finalWorkflowExecution,
      stepExecutions,
      finalStatus,
    });
  }
}
