/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CreateWorkflowCommand, WorkflowDetailDto, WorkflowExecutionDto } from '../types/v1';

export interface ExecuteWorkflowBaseParams {
  request: KibanaRequest;
  spaceId: string;
  inputs?: Record<string, unknown>;
  waitForCompletion?: boolean;
  completionTimeoutSec?: number;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteSavedWorkflowParams extends ExecuteWorkflowBaseParams {
  /** Saved workflow ID. The workflow is fetched, validated, and checked for enabled state. */
  workflowId: string;
  yaml?: never;
  name?: never;
  isTestRun?: never;
}

export interface ExecuteInlineWorkflowParams extends ExecuteWorkflowBaseParams {
  /**
   * Optional synthetic workflow ID used on the execution document, telemetry, and result
   * correlation. It does not trigger a saved-workflow lookup; inline executions are
   * always marked ephemeral by the management API.
   */
  workflowId?: string;
  /** Workflow YAML to validate, parse, execute, and persist on the execution document. */
  yaml: string;
  name?: string;
  /** Authoring/test-run semantics are independent from whether the workflow is ephemeral. */
  isTestRun?: boolean;
}

export type ExecuteWorkflowParams = ExecuteSavedWorkflowParams | ExecuteInlineWorkflowParams;

export interface ExecuteWorkflowResult {
  workflowExecutionId: string;
  execution?: WorkflowExecutionDto;
  timedOut?: boolean;
}

/**
 * Stable, cross-plugin contract for the execution-oriented subset of the workflows
 * management API.
 *
 * This interface lives in the low-level `@kbn/workflows` package (which both the
 * workflows management plugin and its consumers already depend on) so that plugins
 * that cannot depend on `@kbn/workflows-management-plugin` directly — e.g. because a
 * project-reference to it would create a dependency cycle — can still consume the API
 * in a type-safe way.
 *
 * `WorkflowsManagementApi` in `@kbn/workflows-management-plugin` implements this
 * interface. Because the param/result types are defined here (single source of truth)
 * and the concrete class `implements` the interface, any incompatible change to these
 * methods fails the workflows management build until this contract is updated in
 * lock-step — which in turn surfaces the change to every consumer at compile time.
 * There is therefore no way for a consumer to silently drift from the real API.
 */
export interface WorkflowsManagementExecutionApi {
  executeWorkflow(params: ExecuteWorkflowParams): Promise<ExecuteWorkflowResult>;
  createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto>;
  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null>;
  cancelWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}
