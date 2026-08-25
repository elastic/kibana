/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { logWorkflowTaskFailure } from './log_workflow_task_failure';

describe('logWorkflowTaskFailure', () => {
  it('logs final-attempt failures at error level with structured context', () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('task execution failed');

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:run',
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskId: 'task-1',
      attempt: 3,
      maxAttempts: 3,
    });

    expect(logger.error).toHaveBeenCalledWith('Workflow task failed', {
      taskType: 'workflow:run',
      workflowId: undefined,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskId: 'task-1',
      attempt: 3,
      maxAttempts: 3,
      aborted: false,
      errorMessage: 'task execution failed',
      errorName: 'Error',
      error,
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('logs non-final attempts at warn level', () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('transient failure');

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:run',
      workflowRunId: 'run-1',
      attempt: 1,
      maxAttempts: 3,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Workflow task failed',
      expect.objectContaining({
        attempt: 1,
        maxAttempts: 3,
        aborted: false,
      })
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs aborted failures at debug level', () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('aborted');

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:scheduled',
      workflowId: 'wf-1',
      attempt: 1,
      maxAttempts: 3,
      aborted: true,
    });

    expect(logger.debug).toHaveBeenCalledWith(
      'Workflow task failed',
      expect.objectContaining({
        failureKind: 'aborted',
        aborted: true,
      })
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('tags version conflict failures from message markers', () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error(
      '[version_conflict_engine_exception]: version conflict, required seqNo [1], primary term [1]'
    );

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:scheduled',
      workflowId: 'wf-1',
      spaceId: 'default',
      attempt: 3,
      maxAttempts: 3,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Workflow task failed',
      expect.objectContaining({
        failureKind: 'task_manager_version_conflict',
        taskType: 'workflow:scheduled',
        workflowId: 'wf-1',
      })
    );
  });

  it('tags version conflict failures from structured statusCode', () => {
    const logger = loggingSystemMock.createLogger();
    const error = Object.assign(new Error('conflict'), { statusCode: 409 });

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:run',
      attempt: 3,
      maxAttempts: 3,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Workflow task failed',
      expect.objectContaining({
        failureKind: 'task_manager_version_conflict',
      })
    );
  });

  it('tags SavedObjects conflict errors', () => {
    const logger = loggingSystemMock.createLogger();
    const error = SavedObjectsErrorHelpers.createConflictError('task', 'task-1');

    logWorkflowTaskFailure(logger, error, {
      taskType: 'workflow:resume',
      attempt: 3,
      maxAttempts: 3,
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Workflow task failed',
      expect.objectContaining({
        failureKind: 'task_manager_version_conflict',
      })
    );
  });
});
