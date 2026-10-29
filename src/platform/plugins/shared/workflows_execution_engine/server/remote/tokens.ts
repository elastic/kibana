/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

/**
 * Same stable id as Workflows Extensions' catalogue token. Reconstructed independently in each
 * isolate so the executor does not import that plugin.
 */
export const WorkflowStepCatalogToken =
  createToken<WorkflowStepCatalogApi>('workflows.stepCatalog');

export interface WorkflowStepCatalogApi {
  supports(stepType: string): boolean;
  run(
    stepType: string,
    scopeId: string,
    input: unknown,
    context: {
      readonly attribution?: {
        readonly type: string;
        readonly id: string;
        readonly name: string;
        readonly runId: string;
      };
    }
  ): Promise<unknown>;
}

export interface WorkflowThreadIdentity {
  readonly threadId: number;
  readonly isMainThread: boolean;
}

export interface WorkflowStorageApi {
  getExecution(
    scopeId: string,
    workflowRunId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution>;
  markRunning(scopeId: string, workflowRunId: string, spaceId: string): Promise<void>;
  recordStep(scopeId: string, step: EsWorkflowStepExecution): Promise<void>;
  complete(
    scopeId: string,
    update: {
      id: string;
      status: EsWorkflowExecution['status'];
      error?: EsWorkflowExecution['error'];
      startedAt?: string;
    }
  ): Promise<void>;
  whereAmI(): Promise<WorkflowThreadIdentity> | WorkflowThreadIdentity;
}

export interface WorkflowLogApi {
  info(message: string): Promise<void> | void;
}

export interface WorkflowExecutorApi {
  run(request: {
    scopeId: string;
    workflowRunId: string;
    spaceId: string;
  }): Promise<{ status: string }>;
  placement(): Promise<{
    executor: WorkflowThreadIdentity;
    storage: WorkflowThreadIdentity;
  }>;
  block(milliseconds: number): Promise<number>;
}

/** Same stable id as the Workflows Extensions contribution kind. */
export const WorkflowStepKind = createToken<unknown>('workflows.step');

export const WorkflowStorageToken = createToken<WorkflowStorageApi>('workflows.storage');
export const WorkflowLogToken = createToken<WorkflowLogApi>('workflows.log');
export const WorkflowExecutorToken = createToken<WorkflowExecutorApi>('workflows.executor');
