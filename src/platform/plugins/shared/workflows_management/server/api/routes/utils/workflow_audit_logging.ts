/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { AuditEvent } from '@kbn/security-plugin-types-server';

/**
 * Stable action names for xpack.security.audit.ignore_filters.
 * Bulk create/delete APIs use dedicated actions (`workflow_bulk_*`) so operators can filter bulk
 * traffic without matching on message text.
 */
export const WorkflowManagementAuditActions = {
  CREATE: 'workflow_create',
  BULK_CREATE: 'workflow_bulk_create',
  UPDATE: 'workflow_update',
  DELETE: 'workflow_delete',
  BULK_DELETE: 'workflow_bulk_delete',
  CLONE: 'workflow_clone',
  EXPORT: 'workflow_export',
  MGET: 'workflow_mget',
  GET: 'workflow_get',
  RUN: 'workflow_run',
  TEST: 'workflow_test',
  TEST_STEP: 'workflow_test_step',
  CANCEL_EXECUTION: 'workflow_execution_cancel',
  RESUME_EXECUTION: 'workflow_execution_resume',
} as const;

type WorkflowAuditEventType = 'access' | 'change' | 'creation' | 'deletion';

/**
 * Builds a workflow-management audit event (success vs failure from presence of `error`).
 * Non-`Error` values use ECS error code `Unknown` and `String(error)` as the message.
 */
function createEvent(
  action: string,
  eventType: WorkflowAuditEventType,
  message: string,
  error?: unknown
): AuditEvent {
  const event: AuditEvent = {
    message,
    event: {
      action,
      category: ['database'],
      type: [eventType],
      outcome: error !== undefined ? 'failure' : 'success',
    },
  };

  if (error !== undefined) {
    event.error =
      error instanceof Error
        ? { code: error.name, message: error.message }
        : { code: 'Unknown', message: String(error) };
  }

  return event;
}

interface WorkflowManagementAuditLogDeps {
  getSecurityServiceStart: () => SecurityServiceStart | undefined;
}

/**
 * Audit logger for workflow management.
 * Instantiated once with deps; each method takes only `request` + params.
 * Best-effort: sync throws are caught; audit never affects HTTP responses.
 */
export class WorkflowManagementAuditLog {
  constructor(private readonly deps: WorkflowManagementAuditLogDeps) {}

  private log(request: KibanaRequest, event: AuditEvent): void {
    try {
      const security = this.deps.getSecurityServiceStart();
      if (!security) {
        return;
      }
      security.audit.asScoped(request).log(event);
    } catch {
      // Best-effort only: never let audit affect the HTTP response.
    }
  }

  logWorkflowCreated(
    request: KibanaRequest,
    params: { id: string; viaBulkImport?: boolean }
  ): void {
    const { id, viaBulkImport } = params;
    const message = viaBulkImport
      ? `User created workflow via bulk import [id=${id}]`
      : `User created workflow [id=${id}]`;
    const action = viaBulkImport
      ? WorkflowManagementAuditActions.BULK_CREATE
      : WorkflowManagementAuditActions.CREATE;
    this.log(request, createEvent(action, 'creation', message));
  }

  logWorkflowCreateFailed(
    request: KibanaRequest,
    error: unknown,
    options: { bulkOperation?: boolean } = {}
  ): void {
    const message = options.bulkOperation
      ? 'User failed bulk workflow create'
      : 'User failed to create a workflow';
    const action = options.bulkOperation
      ? WorkflowManagementAuditActions.BULK_CREATE
      : WorkflowManagementAuditActions.CREATE;
    this.log(request, createEvent(action, 'creation', message, error));
  }

  /**
   * One `workflow_bulk_create` audit per created workflow and per failed bulk row (bulk POST /api/workflows).
   */
  logBulkWorkflowCreateResults(
    request: KibanaRequest,
    params: {
      created: ReadonlyArray<{ id: string }>;
      failed: ReadonlyArray<{ index: number; id: string; error: string }>;
    }
  ): void {
    for (const workflow of params.created) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.BULK_CREATE,
          'creation',
          `User created workflow via bulk import [id=${workflow.id}]`
        )
      );
    }
    for (const row of params.failed) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.BULK_CREATE,
          'creation',
          `User failed to create workflow via bulk import [index=${row.index}] [id=${row.id}]`,
          row.error
        )
      );
    }
  }

  logWorkflowUpdated(request: KibanaRequest, params: { id: string; error?: unknown }): void {
    const { id, error } = params;
    const message =
      error !== undefined
        ? `User failed to update workflow [id=${id}]`
        : `User updated workflow [id=${id}]`;
    this.log(request, createEvent(WorkflowManagementAuditActions.UPDATE, 'change', message, error));
  }

  logWorkflowDeleted(
    request: KibanaRequest,
    params: { id: string; viaBulkDelete?: boolean; force?: boolean; error?: unknown }
  ): void {
    const { id, viaBulkDelete, force, error } = params;
    const forceTag = force ? ' (force)' : '';
    let message: string;
    if (error !== undefined) {
      message = viaBulkDelete
        ? `User failed to delete workflow via bulk delete [id=${id}]${forceTag}`
        : `User failed to delete workflow [id=${id}]${forceTag}`;
    } else {
      message = viaBulkDelete
        ? `User deleted workflow via bulk delete [id=${id}]${forceTag}`
        : `User deleted workflow [id=${id}]${forceTag}`;
    }
    const action = viaBulkDelete
      ? WorkflowManagementAuditActions.BULK_DELETE
      : WorkflowManagementAuditActions.DELETE;
    this.log(request, createEvent(action, 'deletion', message, error));
  }

  /**
   * One `workflow_bulk_delete` audit event per successfully removed id and per failed id (bulk API).
   */
  logBulkWorkflowDeleteResults(
    request: KibanaRequest,
    params: {
      successfulIds: readonly string[];
      failures: ReadonlyArray<{ id: string; error: string }>;
      force?: boolean;
    }
  ): void {
    const forceTag = params.force ? ' (force)' : '';
    for (const id of params.successfulIds) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.BULK_DELETE,
          'deletion',
          `User deleted workflow via bulk delete [id=${id}]${forceTag}`
        )
      );
    }
    for (const f of params.failures) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.BULK_DELETE,
          'deletion',
          `User failed to delete workflow via bulk delete [id=${f.id}]${forceTag}`,
          f.error
        )
      );
    }
  }

  logBulkWorkflowDeleteFailed(
    request: KibanaRequest,
    error: unknown,
    options: { force?: boolean } = {}
  ): void {
    const forceTag = options.force ? ' (force)' : '';
    this.log(
      request,
      createEvent(
        WorkflowManagementAuditActions.BULK_DELETE,
        'deletion',
        `User failed bulk workflow delete${forceTag}`,
        error
      )
    );
  }

  logWorkflowCloned(
    request: KibanaRequest,
    params: { sourceId: string; newId?: string; error?: unknown }
  ): void {
    const { sourceId, newId, error } = params;
    const message =
      error !== undefined
        ? `User failed to clone workflow [id=${sourceId}]`
        : `User cloned workflow [sourceId=${sourceId}] to [id=${newId}]`;
    this.log(
      request,
      createEvent(WorkflowManagementAuditActions.CLONE, 'creation', message, error)
    );
  }

  /**
   * Export audit: one `workflow_export` event per id on success; a single failure event when `error` is set.
   */
  logWorkflowsExported(
    request: KibanaRequest,
    params: { ids?: readonly string[]; error?: unknown }
  ): void {
    const { ids, error } = params;
    if (error !== undefined) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.EXPORT,
          'access',
          'User failed to export workflows',
          error
        )
      );
      return;
    }
    for (const id of ids ?? []) {
      this.log(
        request,
        createEvent(
          WorkflowManagementAuditActions.EXPORT,
          'access',
          `User exported workflow [id=${id}]`
        )
      );
    }
  }

  logWorkflowAccessed(request: KibanaRequest, params: { id: string; error?: unknown }): void {
    const { id, error } = params;
    const message =
      error !== undefined
        ? `User failed to read workflow [id=${id}]`
        : `User accessed workflow [id=${id}]`;
    this.log(request, createEvent(WorkflowManagementAuditActions.GET, 'access', message, error));
  }

  logWorkflowMget(
    request: KibanaRequest,
    params: { requestedCount?: number; returnedCount?: number; error?: unknown }
  ): void {
    const { error, requestedCount, returnedCount } = params;
    const message =
      error !== undefined
        ? `User failed workflows mget: ${String(error)}`
        : `User requested workflows by ids: requested ${requestedCount}, returned ${returnedCount}`;
    this.log(request, createEvent(WorkflowManagementAuditActions.MGET, 'access', message, error));
  }

  logWorkflowRun(
    request: KibanaRequest,
    params: { workflowId: string; executionId?: string; error?: unknown }
  ): void {
    const { workflowId, executionId, error } = params;
    const message =
      error !== undefined
        ? `User failed to run workflow [id=${workflowId}]`
        : `User ran workflow [id=${workflowId}] [executionId=${executionId}]`;
    this.log(request, createEvent(WorkflowManagementAuditActions.RUN, 'change', message, error));
  }

  logWorkflowTest(
    request: KibanaRequest,
    params: { workflowExecutionId: string; workflowId?: string; error?: unknown }
  ): void {
    const { workflowExecutionId, workflowId, error } = params;
    const wfPart = workflowId !== undefined ? `[workflowId=${workflowId}]` : '[draft yaml]';
    const executionPart =
      workflowExecutionId !== undefined ? `[executionId=${workflowExecutionId}]` : '';
    const message =
      error !== undefined
        ? `User failed to test workflow ${wfPart} ${executionPart}`
        : `User tested workflow ${wfPart} ${executionPart}`;
    this.log(request, createEvent(WorkflowManagementAuditActions.TEST, 'change', message, error));
  }

  logWorkflowStepTest(
    request: KibanaRequest,
    params: {
      stepId: string;
      workflowExecutionId: string;
      workflowId?: string;
      error?: unknown;
    }
  ): void {
    const { stepId, workflowExecutionId, workflowId, error } = params;
    const wfPart = workflowId !== undefined ? `[workflowId=${workflowId}]` : '[draft yaml]';
    const executionPart =
      workflowExecutionId !== undefined ? `[executionId=${workflowExecutionId}]` : '';
    const message =
      error !== undefined
        ? `User failed to test workflow step [stepId=${stepId}] ${wfPart} ${executionPart}`
        : `User tested workflow step [stepId=${stepId}] ${wfPart} ${executionPart}`;
    this.log(
      request,
      createEvent(WorkflowManagementAuditActions.TEST_STEP, 'change', message, error)
    );
  }

  logExecutionCanceled(
    request: KibanaRequest,
    params: { executionId: string; error?: unknown }
  ): void {
    const { executionId, error } = params;
    const message =
      error !== undefined
        ? `User failed to cancel workflow execution [executionId=${executionId}]`
        : `User canceled workflow execution [executionId=${executionId}]`;
    this.log(
      request,
      createEvent(WorkflowManagementAuditActions.CANCEL_EXECUTION, 'change', message, error)
    );
  }

  logExecutionResumed(
    request: KibanaRequest,
    params: { executionId: string; error?: unknown }
  ): void {
    const { executionId, error } = params;
    const message =
      error !== undefined
        ? `User failed to resume workflow execution [executionId=${executionId}]`
        : `User resumed workflow execution [executionId=${executionId}]`;
    this.log(
      request,
      createEvent(WorkflowManagementAuditActions.RESUME_EXECUTION, 'change', message, error)
    );
  }
}
