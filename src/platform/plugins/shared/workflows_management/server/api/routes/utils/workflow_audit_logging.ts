/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuditEvent } from '@kbn/security-plugin-types-server';
import type { WorkflowsRequestHandlerContext } from '../../../types';

/** Stable action names for xpack.security.audit.ignore_filters */
export const WorkflowManagementAuditActions = {
  CREATE: 'workflow_create',
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

function failureEvent(
  action: string,
  message: string,
  error: unknown,
  eventType: 'access' | 'change' | 'creation' | 'deletion' = 'change'
): AuditEvent {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [eventType],
      outcome: 'failure',
    },
    error: {
      code: err.name,
      message: err.message,
    },
  };
}

function successEvent(
  action: string,
  eventType: 'access' | 'change' | 'creation' | 'deletion',
  message: string
): AuditEvent {
  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [eventType],
      outcome: 'success',
    },
  };
}

async function writeAudit(
  context: WorkflowsRequestHandlerContext,
  event: AuditEvent
): Promise<void> {
  const coreContext = await context.core;
  coreContext.security.audit.logger.log(event);
}

/** Facade for workflow management audit events (uses `context.core.security.audit.logger`). */
export class WorkflowManagementAuditLog {
  static async logWorkflowCreated(
    context: WorkflowsRequestHandlerContext,
    params: { id: string; viaBulkImport?: boolean }
  ): Promise<void> {
    const { id, viaBulkImport } = params;
    const message = viaBulkImport
      ? `User created workflow via bulk import [id=${id}]`
      : `User created workflow [id=${id}]`;
    await writeAudit(
      context,
      successEvent(WorkflowManagementAuditActions.CREATE, 'creation', message)
    );
  }

  static async logWorkflowCreateFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown,
    options: { bulkOperation?: boolean } = {}
  ): Promise<void> {
    const message = options.bulkOperation
      ? 'User failed bulk workflow create'
      : 'User failed to create a workflow';
    await writeAudit(
      context,
      failureEvent(WorkflowManagementAuditActions.CREATE, message, error, 'creation')
    );
  }

  static async logBulkCreateRowFailed(
    context: WorkflowsRequestHandlerContext,
    params: { index: number; id: string; error: string }
  ): Promise<void> {
    const { index, id, error: errorMessage } = params;
    await writeAudit(context, {
      message: `User failed to create workflow via bulk import [index=${index}] [id=${id}]: ${errorMessage}`,
      event: {
        action: WorkflowManagementAuditActions.CREATE,
        category: ['database'],
        type: ['creation'],
        outcome: 'failure',
      },
      error: {
        code: 'bulk_create_row',
        message: errorMessage,
      },
    });
  }

  /**
   * One `workflow_create` audit per created workflow and per failed bulk row (bulk POST /api/workflows).
   */
  static async logBulkWorkflowCreateResults(
    context: WorkflowsRequestHandlerContext,
    params: {
      created: ReadonlyArray<{ id: string }>;
      failed: ReadonlyArray<{ index: number; id: string; error: string }>;
    }
  ): Promise<void> {
    for (const workflow of params.created) {
      await WorkflowManagementAuditLog.logWorkflowCreated(context, {
        id: workflow.id,
        viaBulkImport: true,
      });
    }
    for (const row of params.failed) {
      await WorkflowManagementAuditLog.logBulkCreateRowFailed(context, {
        index: row.index,
        id: row.id,
        error: row.error,
      });
    }
  }

  static async logWorkflowUpdated(
    context: WorkflowsRequestHandlerContext,
    params: { id: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.UPDATE,
        'change',
        `User updated workflow [id=${params.id}]`
      )
    );
  }

  static async logWorkflowUpdateFailed(
    context: WorkflowsRequestHandlerContext,
    params: { id: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.UPDATE,
        `User failed to update workflow [id=${params.id}]`,
        params.error
      )
    );
  }

  static async logWorkflowDeleted(
    context: WorkflowsRequestHandlerContext,
    params: { id: string; viaBulkDelete?: boolean }
  ): Promise<void> {
    const { id, viaBulkDelete } = params;
    const message = viaBulkDelete
      ? `User deleted workflow via bulk delete [id=${id}]`
      : `User deleted workflow [id=${id}]`;
    await writeAudit(
      context,
      successEvent(WorkflowManagementAuditActions.DELETE, 'deletion', message)
    );
  }

  static async logWorkflowDeleteFailed(
    context: WorkflowsRequestHandlerContext,
    params: { id: string; error: unknown; viaBulkDelete?: boolean }
  ): Promise<void> {
    const { id, error, viaBulkDelete } = params;
    const message = viaBulkDelete
      ? `User failed to delete workflow via bulk delete [id=${id}]`
      : `User failed to delete workflow [id=${id}]`;
    await writeAudit(
      context,
      failureEvent(WorkflowManagementAuditActions.DELETE, message, error, 'deletion')
    );
  }

  /**
   * One `workflow_delete` audit event per successfully removed id and per failed id (bulk API).
   */
  static async logBulkWorkflowDeleteResults(
    context: WorkflowsRequestHandlerContext,
    params: {
      successfulIds: readonly string[];
      failures: ReadonlyArray<{ id: string; error: string }>;
    }
  ): Promise<void> {
    for (const id of params.successfulIds) {
      await WorkflowManagementAuditLog.logWorkflowDeleted(context, { id, viaBulkDelete: true });
    }
    for (const f of params.failures) {
      await WorkflowManagementAuditLog.logWorkflowDeleteFailed(context, {
        id: f.id,
        error: new Error(f.error),
        viaBulkDelete: true,
      });
    }
  }

  static async logBulkWorkflowDeleteFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.BULK_DELETE,
        'User failed bulk workflow delete',
        error,
        'deletion'
      )
    );
  }

  static async logWorkflowCloned(
    context: WorkflowsRequestHandlerContext,
    params: { sourceId: string; newId: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.CLONE,
        'creation',
        `User cloned workflow [sourceId=${params.sourceId}] to [id=${params.newId}]`
      )
    );
  }

  static async logWorkflowCloneFailed(
    context: WorkflowsRequestHandlerContext,
    params: { sourceId: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.CLONE,
        `User failed to clone workflow [id=${params.sourceId}]`,
        params.error,
        'creation'
      )
    );
  }

  /** One audit event per exported workflow id (bulk export). */
  static async logWorkflowsExported(
    context: WorkflowsRequestHandlerContext,
    params: { ids: readonly string[] }
  ): Promise<void> {
    for (const id of params.ids) {
      await writeAudit(
        context,
        successEvent(
          WorkflowManagementAuditActions.EXPORT,
          'access',
          `User exported workflow [id=${id}]`
        )
      );
    }
  }

  static async logWorkflowExported(
    context: WorkflowsRequestHandlerContext,
    params: { id: string }
  ): Promise<void> {
    await WorkflowManagementAuditLog.logWorkflowsExported(context, { ids: [params.id] });
  }

  static async logWorkflowExportFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.EXPORT,
        'User failed to export workflows',
        error,
        'access'
      )
    );
  }

  static async logWorkflowAccessed(
    context: WorkflowsRequestHandlerContext,
    params: { id: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.GET,
        'access',
        `User accessed workflow [id=${params.id}]`
      )
    );
  }

  static async logWorkflowAccessFailed(
    context: WorkflowsRequestHandlerContext,
    params: { id: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.GET,
        `User failed to read workflow [id=${params.id}]`,
        params.error,
        'access'
      )
    );
  }

  static async logWorkflowMget(
    context: WorkflowsRequestHandlerContext,
    params: { requestedCount: number; returnedCount: number }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.MGET,
        'access',
        `User requested workflows by ids: requested ${params.requestedCount}, returned ${params.returnedCount}`
      )
    );
  }

  static async logWorkflowMgetFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.MGET,
        'User failed workflows mget',
        error,
        'access'
      )
    );
  }

  static async logWorkflowRun(
    context: WorkflowsRequestHandlerContext,
    params: { workflowId: string; executionId: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.RUN,
        'change',
        `User ran workflow [id=${params.workflowId}] [executionId=${params.executionId}]`
      )
    );
  }

  static async logWorkflowRunFailed(
    context: WorkflowsRequestHandlerContext,
    params: { workflowId: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.RUN,
        `User failed to run workflow [id=${params.workflowId}]`,
        params.error
      )
    );
  }

  static async logWorkflowTest(
    context: WorkflowsRequestHandlerContext,
    params: { workflowExecutionId: string; workflowId?: string }
  ): Promise<void> {
    const workflowRef =
      params.workflowId !== undefined ? `[workflowId=${params.workflowId}]` : '[draft yaml]';
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.TEST,
        'change',
        `User tested workflow ${workflowRef} [executionId=${params.workflowExecutionId}]`
      )
    );
  }

  static async logWorkflowTestFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(WorkflowManagementAuditActions.TEST, 'User failed workflow test', error)
    );
  }

  static async logWorkflowStepTest(
    context: WorkflowsRequestHandlerContext,
    params: {
      stepId: string;
      workflowExecutionId: string;
      workflowId?: string;
    }
  ): Promise<void> {
    const wfPart =
      params.workflowId !== undefined ? `[workflowId=${params.workflowId}]` : '[draft yaml]';
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.TEST_STEP,
        'change',
        `User tested workflow step [stepId=${params.stepId}] ${wfPart} [executionId=${params.workflowExecutionId}]`
      )
    );
  }

  static async logWorkflowStepTestFailed(
    context: WorkflowsRequestHandlerContext,
    error: unknown
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.TEST_STEP,
        'User failed workflow step test',
        error
      )
    );
  }

  static async logExecutionCanceled(
    context: WorkflowsRequestHandlerContext,
    params: { executionId: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.CANCEL_EXECUTION,
        'change',
        `User canceled workflow execution [executionId=${params.executionId}]`
      )
    );
  }

  static async logExecutionCancelFailed(
    context: WorkflowsRequestHandlerContext,
    params: { executionId: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.CANCEL_EXECUTION,
        `User failed to cancel workflow execution [executionId=${params.executionId}]`,
        params.error
      )
    );
  }

  static async logExecutionResumed(
    context: WorkflowsRequestHandlerContext,
    params: { executionId: string }
  ): Promise<void> {
    await writeAudit(
      context,
      successEvent(
        WorkflowManagementAuditActions.RESUME_EXECUTION,
        'change',
        `User resumed workflow execution [executionId=${params.executionId}]`
      )
    );
  }

  static async logExecutionResumeFailed(
    context: WorkflowsRequestHandlerContext,
    params: { executionId: string; error: unknown }
  ): Promise<void> {
    await writeAudit(
      context,
      failureEvent(
        WorkflowManagementAuditActions.RESUME_EXECUTION,
        `User failed to resume workflow execution [executionId=${params.executionId}]`,
        params.error
      )
    );
  }
}
