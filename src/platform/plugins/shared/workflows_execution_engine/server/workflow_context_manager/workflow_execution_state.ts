/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  type EsWorkflowExecution,
  type EsWorkflowStepExecution,
  ExecutionStatus,
} from '@kbn/workflows';
import type {
  StepExecutionEvent,
  StepExecutionFinishedEvent,
  StepExecutionStartedEvent,
  StepExecutionWaitingEvent,
} from '../repositories/step_executions/step_execution_data_stream';
import type { StepExecutionRepository } from '../repositories/step_executions/step_execution_repository';
import { StepExecutionRepositoryOld } from '../repositories/step_executions/step_execution_repository_old';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

export class WorkflowExecutionState {
  private stepExecutionRepositoryOld: StepExecutionRepositoryOld; // TODO: TO REMOVE
  private stepDocumentsChanges: Map<string, Partial<EsWorkflowStepExecution>> = new Map(); // TODO: TO REMOVE
  private async flushStepChangesOld(): Promise<void> {
    // TODO: TO REMOVE
    if (!this.stepDocumentsChanges.size) {
      return;
    }
    const stepDocumentsChanges = Array.from(this.stepDocumentsChanges.values());

    this.stepDocumentsChanges.clear();
    await this.stepExecutionRepositoryOld.bulkUpsert(stepDocumentsChanges);
  }

  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowDocumentChanges: Partial<EsWorkflowExecution> | undefined = undefined;
  private events: StepExecutionEvent[] = [];

  /**
   * Maps step IDs to their execution IDs in chronological order.
   * This index enables efficient lookup of all executions for a given step,
   * which is especially important for steps that execute multiple times
   * (e.g., in loops or retries).
   */
  private stepIdExecutionIdIndex = new Map<string, string[]>();

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;

    this.stepExecutionRepositoryOld = new StepExecutionRepositoryOld(
      this.workflowStepExecutionRepository.esClient
    );
  }

  public async load(): Promise<void> {
    const foundEvents = await this.workflowStepExecutionRepository.getStepExecutionEvents(
      this.workflowExecution.stepExecutionIds ?? []
    );

    const groupedByStepExecutionId = new Map<string, StepExecutionEvent[]>();
    foundEvents.forEach((event) => {
      if (!groupedByStepExecutionId.has(event.stepExecutionId)) {
        groupedByStepExecutionId.set(event.stepExecutionId, []);
      }
      groupedByStepExecutionId.get(event.stepExecutionId)!.push(event);
    });

    groupedByStepExecutionId.entries().forEach(([stepExecutionId, events]) => {
      const sorted = events.toSorted((a, b) => {
        if (a.type === 'started' && b.type !== 'started') return -1;
        if (a.type !== 'started' && b.type === 'started') return 1;
        return 0;
      });
      this.stepExecutions.set(
        stepExecutionId,
        sorted.reduce(
          (acc, event) => ({ ...acc, ...this.mapEventToStepExecution(event) }),
          {}
        ) as EsWorkflowStepExecution
      );
    });
    this.buildStepIdExecutionIdIndex();
  }

  private mapEventToStepExecution(event: StepExecutionEvent): Partial<EsWorkflowStepExecution> {
    if (event.type === 'started') {
      const startedEvent = event as StepExecutionStartedEvent;
      return {
        id: startedEvent.stepExecutionId,
        stepId: startedEvent.stepId,
        stepType: startedEvent.stepType,
        status: ExecutionStatus.RUNNING,
        startedAt: startedEvent['@timestamp'] as string,
        topologicalIndex: startedEvent.topologicalIndex,
        globalExecutionIndex: startedEvent.globalExecutionIndex,
        stepExecutionIndex: startedEvent.stepExecutionIndex,
        input: startedEvent.input,
      };
    } else if (event.type === 'finished') {
      const finishedEvent = event as StepExecutionFinishedEvent;
      return {
        id: finishedEvent.stepExecutionId,
        status: finishedEvent.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
        finishedAt: finishedEvent['@timestamp'] as string,
        error: finishedEvent.error,
        output: finishedEvent.output,
      };
    }

    throw new Error(`Unknown step execution event type: ${(event as StepExecutionEvent).type}`);
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecution;
  }

  public updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): void {
    this.workflowExecution = {
      ...this.workflowExecution,
      ...workflowExecution,
    };
    this.workflowDocumentChanges = {
      ...(this.workflowDocumentChanges || {}),
      ...workflowExecution,
    };
  }

  public getAllStepExecutions(): EsWorkflowStepExecution[] {
    return Array.from(this.stepExecutions.values());
  }

  public getStepExecution(stepExecutionId: string): EsWorkflowStepExecution | undefined {
    return this.stepExecutions.get(stepExecutionId);
  }

  /**
   * Retrieves all executions for a specific workflow step in chronological order.
   * @param stepId The unique identifier of the step
   * @returns An array of step execution objects or undefined if no executions exist
   */
  public getStepExecutionsByStepId(stepId: string): EsWorkflowStepExecution[] {
    if (!this.stepIdExecutionIdIndex.has(stepId)) {
      return [];
    }

    return (
      this.stepIdExecutionIdIndex
        .get(stepId)
        ?.map((executionId) => this.stepExecutions.get(executionId) as EsWorkflowStepExecution) ??
      []
    );
  }

  /**
   * Retrieves the latest execution for a specific workflow step.
   * @param stepId The unique identifier of the step
   * @returns The latest step execution object or undefined if no executions exist
   */
  public getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined {
    const allExecutions = this.getStepExecutionsByStepId(stepId);

    if (!allExecutions?.length) {
      return undefined;
    }

    return allExecutions[allExecutions.length - 1];
  }

  public async flushStepChanges(): Promise<void> {
    if (!this.events.length) {
      return;
    }

    await this.workflowStepExecutionRepository.bulkUpsert(this.events);
    this.events = [];
    // this.flushStepChangesOld(); // TODO: TO REMOVE
  }

  public async flush(): Promise<void> {
    await Promise.all([this.flushWorkflowChanges(), this.flushStepChanges()]);
  }

  private async flushWorkflowChanges(): Promise<void> {
    if (!this.workflowDocumentChanges) {
      return;
    }
    const changes = this.workflowDocumentChanges;
    this.workflowDocumentChanges = undefined;

    await this.workflowExecutionRepository.updateWorkflowExecution({
      ...changes,
      id: this.workflowExecution.id,
      // Include all step execution IDs sorted by execution order for O(1) mget lookup on read side
      stepExecutionIds: Array.from(this.stepExecutions.values())
        .sort((a, b) => a.globalExecutionIndex - b.globalExecutionIndex)
        .map((step) => step.id),
    });
  }

  startStep(
    event: Omit<
      StepExecutionStartedEvent,
      | 'type'
      | 'workflowRunId'
      | 'workflowId'
      | 'spaceId'
      | 'globalExecutionIndex'
      | 'stepExecutionIndex'
      | 'status'
    >
  ) {
    const stepExecutions = this.getStepExecutionsByStepId(event.stepId as string) || [];
    if (!stepExecutions.length) {
      this.stepIdExecutionIdIndex.set(event.stepId as string, []);
    }
    this.stepIdExecutionIdIndex.get(event.stepId as string)?.push(event.stepExecutionId as string);
    const newStep: EsWorkflowStepExecution = {
      ...event,
      id: event.stepExecutionId,
      globalExecutionIndex: this.stepExecutions.size,
      stepExecutionIndex: stepExecutions.length,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      spaceId: this.workflowExecution.spaceId,
      stepId: event.stepId,
      stepType: event.stepType,
      scopeStack: event.scopeStack,
      topologicalIndex: event.topologicalIndex,
      status: ExecutionStatus.RUNNING,
      startedAt: event['@timestamp'],
    } as EsWorkflowStepExecution;
    this.stepExecutions.set(event.stepExecutionId as string, newStep);
    this.events.push({
      ...event,
      type: 'started',
      spaceId: this.workflowExecution.spaceId,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      globalExecutionIndex: newStep.globalExecutionIndex,
      stepExecutionIndex: newStep.stepExecutionIndex,
    });
    this.stepDocumentsChanges.set(
      event.stepExecutionId!,
      this.stepExecutions.get(event.stepExecutionId!) || {}
    );
  }

  finishStep(
    event: Omit<StepExecutionFinishedEvent, 'type' | 'workflowRunId' | 'workflowId' | 'spaceId'>
  ) {
    this.stepExecutions.set(event.stepExecutionId!, {
      ...(this.stepExecutions.get(event.stepExecutionId!) || {}),
      ...{
        finishedAt: event['@timestamp'],
        output: event.output,
        error: event.error,
        status: event.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
      },
    } as EsWorkflowStepExecution);
    this.events.push({
      ...event,
      type: 'finished',
      spaceId: this.workflowExecution.spaceId,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
    });
    this.stepDocumentsChanges.set(
      event.stepExecutionId!,
      this.stepExecutions.get(event.stepExecutionId!) || {}
    );
  }

  transitToWaiting(
    event: Omit<StepExecutionWaitingEvent, 'type' | 'workflowRunId' | 'workflowId' | 'spaceId'>
  ) {
    this.stepExecutions.set(event.stepExecutionId!, {
      ...(this.stepExecutions.get(event.stepExecutionId!) || {}),
      ...{
        status: ExecutionStatus.WAITING,
      },
    } as EsWorkflowStepExecution);

    this.events.push({
      ...event,
      type: 'waiting',
      spaceId: this.workflowExecution.spaceId,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
    });
    this.stepDocumentsChanges.set(
      event.stepExecutionId!,
      this.stepExecutions.get(event.stepExecutionId!) || {}
    );
  }

  private buildStepIdExecutionIdIndex(): void {
    this.stepIdExecutionIdIndex.clear();
    for (const step of this.stepExecutions.values()) {
      if (!this.stepIdExecutionIdIndex.has(step.stepId)) {
        this.stepIdExecutionIdIndex.set(step.stepId, []);
      }
      this.stepIdExecutionIdIndex.get(step.stepId)!.push(step.id);
    }

    for (const [stepId, stepExecutionIds] of this.stepIdExecutionIdIndex.entries()) {
      this.stepIdExecutionIdIndex.set(
        stepId,
        stepExecutionIds.sort((a, b) => {
          const aExecution = this.stepExecutions.get(a);
          const bExecution = this.stepExecutions.get(b);
          return (aExecution?.stepExecutionIndex ?? 0) - (bExecution?.stepExecutionIndex ?? 0);
        })
      );
    }
  }
}
