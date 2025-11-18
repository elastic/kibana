/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, ExecutionError, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowContextManager } from './workflow_context_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { RunStepResult } from '../step/node_implementation';
import { mapError } from '../utils';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

interface StepExecutionRuntimeInit {
  contextManager: WorkflowContextManager;
  workflowExecutionState: WorkflowExecutionState;
  workflowExecutionGraph: WorkflowGraph;
  stepLogger: IWorkflowEventLogger;
  stepExecutionId: string;
  node: GraphNodeUnion;
  stackFrames: StackFrame[];
}

/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `StepExecutionRuntime` class is responsible for orchestrating the execution of workflow steps,
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
export class StepExecutionRuntime {
  private workflowExecutionState: WorkflowExecutionState;
  private workflowGraph: WorkflowGraph;
  private stackFrames: StackFrame[];

  public contextManager: WorkflowContextManager;
  public readonly stepExecutionId: string;
  public readonly stepLogger: IWorkflowEventLogger;
  public readonly node: GraphNodeUnion;
  public readonly abortController = new AbortController();

  public get scopeStack(): WorkflowScopeStack {
    return WorkflowScopeStack.fromStackFrames(this.stackFrames);
  }

  public get stepExecution(): EsWorkflowStepExecution | undefined {
    return this.workflowExecutionState.getStepExecution(this.stepExecutionId);
  }

  private get topologicalOrder(): string[] {
    return this.workflowGraph.topologicalOrder;
  }

  constructor(stepExecutionRuntimeInit: StepExecutionRuntimeInit) {
    this.workflowGraph = stepExecutionRuntimeInit.workflowExecutionGraph;
    this.contextManager = stepExecutionRuntimeInit.contextManager;

    // Use workflow execution ID as traceId for APM compatibility
    this.stepLogger = stepExecutionRuntimeInit.stepLogger;
    this.workflowExecutionState = stepExecutionRuntimeInit.workflowExecutionState;
    this.node = stepExecutionRuntimeInit.node;
    this.stepExecutionId = stepExecutionRuntimeInit.stepExecutionId;
    this.stackFrames = stepExecutionRuntimeInit.stackFrames;
  }

  private get workflowExecution() {
    return this.workflowExecutionState.getWorkflowExecution();
  }

  public stepExecutionExists(): boolean {
    return !!this.workflowExecutionState.getStepExecution(this.stepExecutionId);
  }

  public getCurrentStepResult(): RunStepResult | undefined {
    const stepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);

    if (!stepExecution) {
      return undefined;
    }
    return {
      input: stepExecution.input || {},
      output: stepExecution.output || {},
      error: stepExecution.error,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getCurrentStepState(): Record<string, any> | undefined {
    return this.workflowExecutionState.getStepExecution(this.stepExecutionId)?.state;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async setCurrentStepState(state: Record<string, any> | undefined): Promise<void> {
    const stepId = this.node.stepId;
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      stepId,
      state,
    });
  }

  public async startStep(): Promise<void> {
    const stepId = this.node.stepId;
    const stepStartedAt = new Date();

    const stepExecution = {
      id: this.stepExecutionId,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
      scopeStack: this.workflowExecution.scopeStack,
      topologicalIndex: this.topologicalOrder.indexOf(this.node.id),
      status: ExecutionStatus.RUNNING,
      startedAt: stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    this.workflowExecutionState.upsertStep(stepExecution);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.logStepStart(stepId, stepExecution.id!);
    await this.workflowExecutionState.flushStepChanges();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async setInput(input: Record<string, any>): Promise<void> {
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      input,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async finishStep(stepOutput?: Record<string, any>): Promise<void> {
    const startedStepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);
    const stepExecutionUpdate = {
      id: this.stepExecutionId,
      status: ExecutionStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      output: stepOutput,
    } as Partial<EsWorkflowStepExecution>;

    if (startedStepExecution?.startedAt) {
      stepExecutionUpdate.executionTimeMs =
        new Date(stepExecutionUpdate.completedAt as string).getTime() -
        new Date(startedStepExecution.startedAt).getTime();
    }

    this.workflowExecutionState.upsertStep(stepExecutionUpdate);
    this.logStepComplete(stepExecutionUpdate);
  }

  public async failStep(error: Error | ExecutionError | string): Promise<void> {
    // if there is a last step execution, fail it
    // if not, create a new step execution with fail
    const executionError = mapError(error);
    const startedStepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);
    const stepExecutionUpdate = {
      id: this.stepExecutionId,
      status: ExecutionStatus.FAILED,
      scopeStack: this.stackFrames,
      completedAt: new Date().toISOString(),
      output: null,
      error: executionError,
    } as Partial<EsWorkflowStepExecution>;

    if (startedStepExecution && startedStepExecution.startedAt) {
      stepExecutionUpdate.executionTimeMs =
        new Date(stepExecutionUpdate.completedAt as string).getTime() -
        new Date(startedStepExecution.startedAt).getTime();
    }
    this.workflowExecutionState.updateWorkflowExecution({
      error: executionError,
    });
    this.workflowExecutionState.upsertStep(stepExecutionUpdate);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.logStepFail(stepExecutionUpdate.id!, executionError);
  }

  public async setWaitStep(): Promise<void> {
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      status: ExecutionStatus.WAITING,
    });

    this.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.WAITING,
    });
  }

  private logStepStart(stepId: string, stepExecutionId: string): void {
    this.stepLogger?.logInfo(`Step '${stepId}' started`, {
      workflow: { step_id: stepId, step_execution_id: stepExecutionId },
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
      labels: {
        step_type: this.node.stepType,
        connector_type: this.node.stepType,
        step_name: this.node.stepId,
        step_id: stepId,
      },
    });
  }

  private logStepComplete(step: Partial<EsWorkflowStepExecution>): void {
    const isSuccess = step?.status === ExecutionStatus.COMPLETED;
    const stepId = this.node.stepId;
    this.stepLogger?.logInfo(`Step '${stepId}' ${isSuccess ? 'completed' : 'failed'}`, {
      workflow: { step_id: stepId, step_execution_id: step.id },
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
      labels: {
        step_type: this.node.stepType,
        connector_type: this.node.stepType,
        step_name: this.node.stepId,
        step_id: this.node.stepId,
        execution_time_ms: step.executionTimeMs,
      },
      ...(step.error && {
        error: {
          message: step.error.message,
          type: step.error.type,
          // stack_trace: typeof step.error === 'string' ? undefined : (step.error as Error)?.stack,
        },
      }),
    });
  }

  private logStepFail(stepExecutionId: string, error: ExecutionError): void {
    const stepName = this.node.stepId;
    const stepType = this.node.stepType || 'unknown';
    const _error = typeof error === 'string' ? Error(error) : error;

    // Include error message in the log message
    const errorMsg = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const message = `Step '${stepName}' failed: ${errorMsg}`;

    // this.stepLogger?.logError(message, _error, {
    //   workflow: { step_id: this.node.stepId, step_execution_id: stepExecutionId },
    //   event: { action: 'step-fail', category: ['workflow', 'step'] },
    //   tags: ['workflow', 'step', 'fail'],
    //   labels: {
    //     step_type: stepType,
    //     connector_type: stepType,
    //     step_name: stepName,
    //     step_id: this.node.stepId,
    //   },
    // });
  }
}
