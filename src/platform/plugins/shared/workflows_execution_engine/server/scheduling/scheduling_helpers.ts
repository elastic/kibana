/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import isEqual from 'lodash/isEqual';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
  WorkflowSettings,
} from '@kbn/workflows';
import { WorkflowDisabledError } from '@kbn/workflows/common/errors';
import type { SchedulingCoreStart, SchedulingDeps } from './types';
import type { ConcurrencyManager } from '../concurrency/concurrency_manager';
import { maybeDrainConcurrencyQueueBeforeEnqueue } from '../concurrency/concurrency_queue_drainer';
import { buildWorkflowExecutionDocument } from '../lib/build_workflow_execution_document';
import { ensureBoundExecutionAdmitted } from '../lib/ensure_bound_execution_admitted';
import { getAuthenticatedUser } from '../lib/get_user';
import { hasWorkflowAccess } from '../lib/has_workflow_access';
import { refuseStandaloneDelegatedIdentityRun } from '../refuse_standalone_delegated_identity';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import {
  ensureInheritedBindingCurrent,
  getWorkflowOriginalRequest,
  resolveInheritedWorkflowIdentity,
  WORKFLOW_SERVICE_ACCOUNT_TYPE,
} from '../service_account_execution';
import { buildWorkflowRenderContext } from '../workflow_context_manager/build_workflow_context';
import type { WorkflowExecutionForInputRendering } from '../workflow_context_manager/build_workflow_context';
import type { ContextDependencies } from '../workflow_context_manager/types';
import type { StartWorkflowExecutionParams } from '../workflow_task_manager/types';
import { WORKFLOW_RUN_TASK_TYPE } from '../workflow_task_manager/types';
import { getTaskPriority } from '../workflow_task_manager/workflow_task_manager';

/**
 * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
 * Normalizes the partial workflowExecution to build the workflow context needed for template evaluation.
 *
 * @param deps - The concurrency manager (may not be initialized yet) and logger
 * @param workflowExecution - The partial workflow execution
 * @param workflowSettings - The workflow settings from workflow definition
 * @param coreStart - Core start services
 * @param dependencies - Context dependencies for building workflow context
 * @returns The evaluated concurrency group key, or null if not applicable
 */
export function getConcurrencyGroupKey(
  { concurrencyManager, logger }: { concurrencyManager?: ConcurrencyManager; logger: Logger },
  workflowExecution: Partial<EsWorkflowExecution>,
  workflowSettings: WorkflowSettings | undefined,
  coreStart: Pick<SchedulingCoreStart, 'http'>,
  dependencies: Pick<ContextDependencies, 'cloudSetup'>
): string | null {
  if (!workflowSettings?.concurrency?.key) {
    return null;
  }

  // Guard check: ConcurrencyManager may not be initialized if task executes before start().
  // This should not occur in normal operation.
  if (!concurrencyManager) {
    logger.warn('ConcurrencyManager not initialized, skipping concurrency key evaluation.');
    return null;
  }

  const normalizedWorkflowExecution: EsWorkflowExecution = {
    scopeStack: [],
    error: null,
    startedAt: null,
    finishedAt: '',
    cancelRequested: false,
    duration: 0,
    ...workflowExecution,
  } as EsWorkflowExecution;

  // Concurrency keys are evaluated before validateWorkflowInputs renders and persists inputs.
  // Liquid-rendered input defaults or templated input values are not supported here.
  return concurrencyManager.evaluateConcurrencyKey(
    workflowSettings.concurrency,
    buildWorkflowRenderContext(normalizedWorkflowExecution, coreStart, dependencies),
    workflowSettings.liquid
  );
}

/**
 * Checks concurrency limits and applies collision strategy if needed.
 * This helper consolidates the duplicated concurrency check logic.
 *
 * For 'drop' strategy: if limit is exceeded, ConcurrencyManager marks execution as SKIPPED.
 * For 'cancel-in-progress' strategy: ConcurrencyManager cancels old executions to make room.
 *
 * @param workflowExecution - The workflow execution (might be partial)
 * @returns Promise<boolean> - true if execution can proceed, false if it should be dropped
 */
export async function checkConcurrencyIfNeeded(
  { concurrencyManager, logger }: { concurrencyManager?: ConcurrencyManager; logger: Logger },
  workflowExecution: Partial<EsWorkflowExecution>
): Promise<boolean> {
  // Guard check: ConcurrencyManager not initialized if task executes before start().
  // This should not occur in normal operation.
  // Execution will proceed without concurrency enforcement.
  if (!concurrencyManager) {
    logger.warn(
      `ConcurrencyManager not initialized, skipping concurrency check for execution ${workflowExecution.id}.`
    );
    return true;
  }

  if (
    !workflowExecution.workflowDefinition?.settings?.concurrency ||
    !workflowExecution.concurrencyGroupKey ||
    !workflowExecution.id ||
    !workflowExecution.spaceId
  ) {
    return true; // No concurrency settings, allow execution
  }

  try {
    const canProceed = await concurrencyManager.checkConcurrency(
      workflowExecution.workflowDefinition.settings.concurrency,
      workflowExecution.concurrencyGroupKey,
      workflowExecution.id,
      workflowExecution.spaceId
    );

    if (!canProceed) {
      logger.debug(
        `Workflow execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}) deferred or skipped per concurrency settings`
      );
    }

    return canProceed;
  } catch (error) {
    // Best-effort concurrency enforcement: log error but allow execution to proceed
    // This prevents a single cancellation failure from blocking new executions
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(
      `Failed to enforce concurrency limits for workflow execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}): ${errorMessage}. Execution will proceed without concurrency enforcement.`
    );
    if (error instanceof Error) {
      logger.debug(`Concurrency enforcement error stack: ${error.stack}`);
    }
    return true; // On error, allow execution to proceed
  }
}

/**
 * Helpers shared by the schedule/execute paths. Built from explicit dependencies so they can be
 * constructed without booting the plugins.
 */
export const createSchedulingHelpers = (
  deps: SchedulingDeps,
  overrides: {
    /** Lets the owner (e.g. the plugin) route concurrency checks through its own method. */
    checkConcurrencyIfNeeded?: (
      workflowExecution: Partial<EsWorkflowExecution>
    ) => Promise<boolean>;
  } = {}
) => {
  const {
    coreStart,
    workflowRepository,
    workflowExecutionRepository,
    workflowTaskManager,
    taskManager,
    logger,
  } = deps;

  const dependencies: Pick<ContextDependencies, 'cloudSetup'> = { cloudSetup: deps.cloudSetup };

  // Re-check that a workflow is still enabled right before persisting an
  // execution document.  The route-level check may have read a stale value
  // if a concurrent hard-delete disabled the workflow in the meantime.
  // Test runs can use disabled or unsaved workflows.
  const ensureWorkflowEnabled = async (workflow: WorkflowExecutionEngineModel, spaceId: string) => {
    if (workflow.isEphemeral || workflow.isTestRun) {
      return;
    }
    const stillEnabled = await workflowRepository.isWorkflowEnabled(workflow.id, spaceId, {
      includeGlobal: true,
    });
    if (!stillEnabled) {
      throw new WorkflowDisabledError(workflow.id);
    }
  };

  const ensureServiceAccountBinding = async (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string
  ): Promise<void> => {
    const serviceAccountId = workflow.definition?.settings?.run_as;
    if (serviceAccountId) {
      if (!coreStart.security.serviceAccounts.isEnabled())
        throw Boom.forbidden('Service account execution is disabled.');
      const saved = await workflowRepository.getWorkflow(workflow.id, spaceId);
      if (!saved || !isEqual(saved.definition, workflow.definition)) {
        throw Boom.badRequest(
          'Service accounts require the latest saved version of the workflow; inline or unsaved YAML cannot run as a service account.'
        );
      }
      const binding = await coreStart.security.serviceAccounts.getWorkloadBinding({
        workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
        workloadId: workflow.id,
        spaceId,
      });
      if (binding?.serviceAccountId !== serviceAccountId)
        throw Boom.forbidden('Workflow service account binding does not match.');
    }
  };

  const buildExecutionDocument = async (args: {
    workflow: WorkflowExecutionEngineModel;
    inheritedIdentity?: EsWorkflowExecution['effectiveIdentity'];
    spaceId: string;
    context: Record<string, unknown>;
    defaultTriggeredBy: string;
    authenticatedUser: string | undefined;
    now: Date;
  }): Promise<WorkflowExecutionForInputRendering> => {
    if (!args.inheritedIdentity) {
      await ensureServiceAccountBinding(args.workflow, args.spaceId);
    }
    return buildWorkflowExecutionDocument({
      ...args,
      maxEventChainDepth: deps.config.eventDriven.maxChainDepth,
      getConcurrencyGroupKey: (execution) =>
        getConcurrencyGroupKey(
          deps,
          execution,
          args.workflow.definition?.settings,
          coreStart,
          dependencies
        ),
    });
  };

  const ensureExecutionAccess = async (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> => {
    if (workflow.isEphemeral) return;
    const current = await workflowRepository.getWorkflow(workflow.id, spaceId, {
      includeGlobal: true,
      includeDeleted: true,
    });
    if (
      current &&
      !(await hasWorkflowAccess(current, request, coreStart, { id: workflow.id, spaceId }))
    ) {
      throw new Error('You do not have permission to execute this workflow.');
    }
  };

  const createAndPersistWorkflowExecution = async (
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, unknown>,
    defaultTriggeredBy: string,
    originalRequest: KibanaRequest,
    options: { refresh: boolean | 'wait_for'; authenticatedUser?: string } = { refresh: false }
  ): Promise<{
    workflowExecution: WorkflowExecutionForInputRendering;
    repository: WorkflowExecutionRepository;
  }> => {
    const request = getWorkflowOriginalRequest(originalRequest);
    const spaceId = (context.spaceId as string | undefined) || 'default';
    await ensureExecutionAccess(workflow, spaceId, request);
    await ensureWorkflowEnabled(workflow, spaceId);
    // Before identity resolution, persistence, and the concurrency drain. A standalone
    // delegated-identity run fails at the first inherit step and, with cancel-in-progress,
    // would cancel the space's in-flight run. Parent workflow.execute sets the flag and
    // must still reach resolveInheritedWorkflowIdentity.
    refuseStandaloneDelegatedIdentityRun(workflow, context);
    const inheritedIdentity = resolveInheritedWorkflowIdentity(originalRequest, workflow, {
      inheritParentIdentity: context.inheritParentIdentity === true,
      parentWorkflowId:
        typeof context.parentWorkflowId === 'string' ? context.parentWorkflowId : undefined,
      parentWorkflowExecutionId:
        typeof context.parentWorkflowExecutionId === 'string'
          ? context.parentWorkflowExecutionId
          : undefined,
      parentStepId: typeof context.parentStepId === 'string' ? context.parentStepId : undefined,
      parentStepName:
        typeof context.parentStepName === 'string' ? context.parentStepName : undefined,
      spaceId,
    });
    if (inheritedIdentity) {
      await ensureInheritedBindingCurrent(coreStart, inheritedIdentity, spaceId);
    }

    const authenticatedUser =
      options.authenticatedUser ??
      (await getAuthenticatedUser(request, coreStart.security, coreStart.elasticsearch.client));

    const workflowExecution = await buildExecutionDocument({
      workflow,
      inheritedIdentity,
      spaceId,
      context,
      defaultTriggeredBy,
      authenticatedUser,
      now: new Date(),
    });

    await maybeDrainConcurrencyQueueBeforeEnqueue({
      workflowExecution,
      workflowExecutionRepository,
      workflowTaskManager,
      logger,
      failureLogLabel: 'Concurrency queue drain before enqueue failed',
    });

    // Bound executions must be searchable before the final admission check so
    // force deletion cannot miss an admitted run. Other runs retain the concurrency-only refresh.
    await workflowExecutionRepository.createWorkflowExecution(workflowExecution, {
      refresh: workflowExecution.effectiveIdentity
        ? options.refresh || 'wait_for'
        : workflowExecution.concurrencyGroupKey
        ? options.refresh
        : false,
    });

    await ensureBoundExecutionAdmitted(
      workflowExecution,
      workflowRepository,
      workflowExecutionRepository
    );
    return { workflowExecution, repository: workflowExecutionRepository };
  };

  // Helper function to create a task instance
  const createTaskInstance = (workflowExecution: Partial<EsWorkflowExecution>, scope: string[]) => {
    const priority = getTaskPriority(workflowExecution.context);
    return {
      id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
      taskType: WORKFLOW_RUN_TASK_TYPE,
      params: {
        workflowRunId: workflowExecution.id,
        spaceId: workflowExecution.spaceId,
      } as StartWorkflowExecutionParams,
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
      scope,
      enabled: true,
      priority,
    };
  };

  const scheduleDeps = {
    taskManager,
    workflowExecutionRepository,
    logger,
  };

  return {
    ensureWorkflowEnabled,
    ensureServiceAccountBinding,
    buildExecutionDocument,
    ensureExecutionAccess,
    createAndPersistWorkflowExecution,
    createTaskInstance,
    scheduleDeps,
    checkConcurrencyIfNeeded:
      overrides.checkConcurrencyIfNeeded ??
      ((workflowExecution: Partial<EsWorkflowExecution>) =>
        checkConcurrencyIfNeeded(deps, workflowExecution)),
  };
};

export type SchedulingHelpers = ReturnType<typeof createSchedulingHelpers>;
