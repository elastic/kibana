/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, IBasePath, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { buildFakeRequestFromTaskApiKey } from './build_fake_request_from_task_api_key';
import {
  WORKFLOW_RECOVERY_METADATA_KEY,
  type WorkflowRecoveryMetadata,
} from './workflow_recovery_constants';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { checkLicense } from '../lib/check_license';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export interface RunWorkflowRecoveryScanDeps {
  coreStart: CoreStart;
  taskManager: TaskManagerStartContract;
  config: WorkflowsExecutionEngineConfig;
  logger: Logger;
  basePath: IBasePath;
  licensing: Parameters<typeof checkLicense>[0];
}

async function tryRecoverExecution(deps: {
  execution: EsWorkflowExecution;
  recovery: WorkflowsExecutionEngineConfig['recovery'];
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  taskManager: TaskManagerStartContract;
  logger: Logger;
  basePath: IBasePath;
}): Promise<void> {
  const {
    execution,
    recovery,
    workflowExecutionRepository,
    workflowTaskManager,
    taskManager,
    logger,
    basePath,
  } = deps;
  const executionId = execution.id;

  const recoveryMeta = getRecoveryMetadata(execution);
  if (recoveryMeta.autoResumeScheduledCount >= recovery.maxAutoResumeAttempts) {
    logger.warn(
      `Workflow recovery: execution ${executionId} exceeded max auto-resume attempts (${recovery.maxAutoResumeAttempts}), marking FAILED`
    );
    await workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      status: ExecutionStatus.FAILED,
      error: {
        type: 'WorkflowRecoveryError',
        message:
          'Automatic workflow recovery stopped after the maximum number of resume attempts. Inspect Task Manager and workflow execution state, or retry manually.',
      },
      metadata: {
        ...(execution.metadata ?? {}),
        [WORKFLOW_RECOVERY_METADATA_KEY]: {
          ...recoveryMeta,
          lastAutoResumeFailureReason: 'max_auto_resume_attempts_exceeded',
        },
      },
    });
    return;
  }

  const hasActive = await workflowTaskManager.hasActiveWorkflowExecutionTask(executionId);
  if (hasActive) {
    logger.debug(
      `Workflow recovery: skipping ${executionId} — active workflow Task Manager task already present`
    );
    return;
  }

  const runTaskId = await workflowTaskManager.findWorkflowRunTaskIdForExecution(executionId);
  if (!runTaskId) {
    logger.debug(
      `Workflow recovery: no workflow:run task for execution ${executionId} — skipping (likely non-task execution path)`
    );
    return;
  }

  let runTask;
  try {
    runTask = await taskManager.get(runTaskId);
  } catch (err) {
    logger.warn(
      `Workflow recovery: failed to load task ${runTaskId} for execution ${executionId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return;
  }

  const fakeRequest = buildFakeRequestFromTaskApiKey(runTask, execution.spaceId, basePath);
  if (!fakeRequest) {
    const nextMeta: WorkflowRecoveryMetadata = {
      ...recoveryMeta,
      autoResumeScheduledCount: recoveryMeta.autoResumeScheduledCount + 1,
      lastAutoResumeFailureReason: 'missing_task_api_key',
      lastAutoResumeScheduledAt: new Date().toISOString(),
    };
    logger.warn(
      `Workflow recovery: task ${runTaskId} has no API key; cannot schedule resume for ${executionId}`
    );
    await workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      metadata: {
        ...(execution.metadata ?? {}),
        [WORKFLOW_RECOVERY_METADATA_KEY]: nextMeta,
      },
    });
    return;
  }

  try {
    await workflowTaskManager.scheduleImmediateResume({
      executionId,
      spaceId: execution.spaceId,
      fakeRequest,
    });
    const nextMeta: WorkflowRecoveryMetadata = {
      ...recoveryMeta,
      autoResumeScheduledCount: recoveryMeta.autoResumeScheduledCount + 1,
      lastAutoResumeScheduledAt: new Date().toISOString(),
    };
    await workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      metadata: {
        ...(execution.metadata ?? {}),
        [WORKFLOW_RECOVERY_METADATA_KEY]: nextMeta,
      },
    });
    logger.info(
      `Workflow recovery: scheduled workflow:resume for execution ${executionId} (space ${execution.spaceId})`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      `Workflow recovery: failed to schedule resume for execution ${executionId}: ${message}`
    );
    const nextMeta: WorkflowRecoveryMetadata = {
      ...recoveryMeta,
      autoResumeScheduledCount: recoveryMeta.autoResumeScheduledCount + 1,
      lastAutoResumeFailureReason: `schedule_error:${message.slice(0, 500)}`,
      lastAutoResumeScheduledAt: new Date().toISOString(),
    };
    await workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      metadata: {
        ...(execution.metadata ?? {}),
        [WORKFLOW_RECOVERY_METADATA_KEY]: nextMeta,
      },
    });
  }
}

function getRecoveryMetadata(execution: EsWorkflowExecution): WorkflowRecoveryMetadata {
  const raw = execution.metadata?.[WORKFLOW_RECOVERY_METADATA_KEY];
  if (!raw || typeof raw !== 'object') {
    return { autoResumeScheduledCount: 0 };
  }
  const count = (raw as WorkflowRecoveryMetadata).autoResumeScheduledCount;
  return {
    autoResumeScheduledCount: typeof count === 'number' && count >= 0 ? count : 0,
    lastAutoResumeScheduledAt: (raw as WorkflowRecoveryMetadata).lastAutoResumeScheduledAt,
    lastAutoResumeFailureReason: (raw as WorkflowRecoveryMetadata).lastAutoResumeFailureReason,
  };
}

export async function runWorkflowRecoveryScan(deps: RunWorkflowRecoveryScanDeps): Promise<void> {
  const { coreStart, taskManager, config, logger, basePath, licensing } = deps;
  const recovery = config.recovery;

  if (!recovery.enabled) {
    return;
  }

  await checkLicense(licensing);

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
  const workflowTaskManager = new WorkflowTaskManager(taskManager);

  const minStartedAt = new Date(Date.now() - recovery.minExecutionAgeSeconds * 1000).toISOString();

  const candidates = await workflowExecutionRepository.searchRecoverableExecutions({
    statuses: [ExecutionStatus.RUNNING],
    minStartedAtIso: minStartedAt,
    size: recovery.batchSize,
  });

  if (candidates.length === 0) {
    logger.debug('Workflow recovery scan: no candidate executions');
    return;
  }

  logger.debug(`Workflow recovery scan: processing ${candidates.length} candidate execution(s)`);

  for (const hit of candidates) {
    await tryRecoverExecution({
      execution: hit._source,
      recovery,
      workflowExecutionRepository,
      workflowTaskManager,
      taskManager,
      logger,
      basePath,
    });
  }
}
