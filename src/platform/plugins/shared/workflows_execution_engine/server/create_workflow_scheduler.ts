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
import type {
  CoreStart,
  ElasticsearchClient,
  IClusterClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import type {
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
  WorkflowSettings,
} from '@kbn/workflows';
import { WorkflowDisabledError } from '@kbn/workflows/common/errors';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
import { maybeDrainConcurrencyQueueBeforeEnqueue } from './concurrency/concurrency_queue_drainer';
import { handleConcurrencyBlockedExecution } from './concurrency/maybe_schedule_dormant_queued_run';
import type { WorkflowsExecutionEngineConfig } from './config';
import { buildWorkflowExecutionDocument } from './lib/build_workflow_execution_document';
import { checkLicense } from './lib/check_license';
import { ensureBoundExecutionAdmitted } from './lib/ensure_bound_execution_admitted';
import { getAuthenticatedUser } from './lib/get_user';
import { resolveWorkflowTaskPacks } from './lib/get_workflow_task_packs';
import { hasWorkflowAccess } from './lib/has_workflow_access';
import { scheduleRunTaskOrMarkFailed } from './lib/schedule_workflow_run_task';
import type {
  ScheduleWorkflowRunTaskDeps,
  WorkflowRunTaskInstance,
} from './lib/schedule_workflow_run_task';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from './repositories/data_access_layer';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import type { ExecutionIdentityContexts } from './service_account_execution';
import {
  ensureInheritedBindingCurrent,
  getWorkflowOriginalRequest,
  resolveInheritedWorkflowIdentity,
  WORKFLOW_SERVICE_ACCOUNT_TYPE,
} from './service_account_execution';
import type { InternalResumeWorkflowExecution, ScheduleWorkflow } from './types';
import { generateExecutionTaskScope } from './utils';
import type { KibanaUrlSource } from './utils/get_kibana_url';
import { buildWorkflowRenderContext } from './workflow_context_manager/build_workflow_context';
import type { WorkflowExecutionForInputRendering } from './workflow_context_manager/build_workflow_context';
import type { WorkflowCloudInfo, WorkflowRuntimeTaskManager } from './workflow_core_services';
import { WORKFLOW_RUN_TASK_TYPE } from './workflow_task_manager/types';
import type { StartWorkflowExecutionParams } from './workflow_task_manager/types';
import {
  getTaskPriority,
  WorkflowTaskManager,
} from './workflow_task_manager/workflow_task_manager';

/** The task manager methods a scheduler uses; the plugin hands over Task Manager's start contract. */
export type WorkflowSchedulerTaskManager = WorkflowRuntimeTaskManager;

/**
 * What the scheduler needs, explicitly, so the execution engine plugin and a task process build it
 * the same way: the plugin from Core and its start dependencies, a process from its host. Nothing
 * here installs an index, a template or a data stream: the data clients are built from the
 * definitions that are already installed.
 */
export interface WorkflowSchedulerDeps {
  taskManager: WorkflowSchedulerTaskManager;
  /** The internal user client. */
  esClient: ElasticsearchClient;
  /** What reads the user of a request and checks the workflow service accounts. */
  security: Pick<SecurityServiceStart, 'authc' | 'audit' | 'serviceAccounts'>;
  userProfile: Pick<CoreStart['userProfile'], 'getCurrentProfileId'>;
  /** The cluster client the user of an API key request is authenticated with. */
  elasticsearch: Pick<IClusterClient, 'asScoped'>;
  licensing: Pick<LicensingPluginStart, 'getLicense'>;
  logger: Logger;
  config: Pick<WorkflowsExecutionEngineConfig, 'eventDriven'>;
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  /** What links to an execution are built from (`server.publicBaseUrl`). */
  kibanaUrlSource?: KibanaUrlSource;
  cloudSetup?: WorkflowCloudInfo;
  /** Resumes the parent of a finished child; only the plugin can, a task process cannot. */
  getInternalResumeWorkflowExecution?: () => InternalResumeWorkflowExecution | undefined;
  /** Where runs as a service account remember the request that scheduled them. */
  identityContexts?: ExecutionIdentityContexts;
}

export interface WorkflowScheduler {
  scheduleWorkflow: ScheduleWorkflow;
  workflowTaskManager: WorkflowTaskManager;
  workflowRepository: WorkflowRepository;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  concurrencyManager: ConcurrencyManager;
  scheduleDeps: ScheduleWorkflowRunTaskDeps;
  checkConcurrencyIfNeeded: (workflowExecution: Partial<EsWorkflowExecution>) => Promise<boolean>;
  getConcurrencyGroupKey: (
    workflowExecution: Partial<EsWorkflowExecution>,
    workflowSettings: WorkflowSettings | undefined
  ) => string | null;
  ensureWorkflowEnabled: (workflow: WorkflowExecutionEngineModel, spaceId: string) => Promise<void>;
  buildExecutionDocument: (args: {
    workflow: WorkflowExecutionEngineModel;
    inheritedIdentity?: EsWorkflowExecution['effectiveIdentity'];
    spaceId: string;
    context: Record<string, unknown>;
    defaultTriggeredBy: string;
    authenticatedUser: string | undefined;
    now: Date;
  }) => Promise<WorkflowExecutionForInputRendering>;
  createAndPersistWorkflowExecution: (
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, unknown>,
    defaultTriggeredBy: string,
    originalRequest: KibanaRequest,
    options?: { refresh: boolean | 'wait_for' }
  ) => Promise<{
    workflowExecution: WorkflowExecutionForInputRendering;
    repository: WorkflowExecutionRepository;
  }>;
  createTaskInstance: (
    workflowExecution: Partial<EsWorkflowExecution>,
    scope: string[]
  ) => WorkflowRunTaskInstance & { scope: string[] };
}

export const createWorkflowScheduler = ({
  taskManager,
  esClient,
  security,
  userProfile,
  elasticsearch,
  licensing,
  logger,
  config,
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  kibanaUrlSource,
  cloudSetup,
  getInternalResumeWorkflowExecution = () => undefined,
  identityContexts,
}: WorkflowSchedulerDeps): WorkflowScheduler => {
  const workflowTaskManager = new WorkflowTaskManager(taskManager, identityContexts);
  const workflowExecutionRepository = new WorkflowExecutionRepository(workflowExecutionsDataClient);
  const stepExecutionRepository = new StepExecutionRepository(stepExecutionsDataClient);
  const workflowRepository = new WorkflowRepository({ esClient, logger });
  const concurrencyManager = new ConcurrencyManager(
    workflowTaskManager,
    workflowExecutionRepository
  );

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
      if (!security.serviceAccounts.isEnabled())
        throw Boom.forbidden('Service account execution is disabled.');
      const saved = await workflowRepository.getWorkflow(workflow.id, spaceId);
      if (!saved || !isEqual(saved.definition, workflow.definition)) {
        throw Boom.badRequest(
          'Service accounts require the latest saved version of the workflow; inline or unsaved YAML cannot run as a service account.'
        );
      }
      const binding = await security.serviceAccounts.getWorkloadBinding({
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
      maxEventChainDepth: config.eventDriven.maxChainDepth,
      getConcurrencyGroupKey: (execution) =>
        getConcurrencyGroupKey(execution, args.workflow.definition?.settings),
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
      !(await hasWorkflowAccess(
        current,
        request,
        { userProfile, security },
        { id: workflow.id, spaceId },
        identityContexts
      ))
    ) {
      throw new Error('You do not have permission to execute this workflow.');
    }
  };

  const createAndPersistWorkflowExecution = async (
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, unknown>,
    defaultTriggeredBy: string,
    originalRequest: KibanaRequest,
    options: { refresh: boolean | 'wait_for' } = { refresh: false }
  ): Promise<{
    workflowExecution: WorkflowExecutionForInputRendering;
    repository: WorkflowExecutionRepository;
  }> => {
    const request = getWorkflowOriginalRequest(originalRequest, identityContexts);
    const spaceId = (context.spaceId as string | undefined) || 'default';
    await ensureExecutionAccess(workflow, spaceId, request);
    await ensureWorkflowEnabled(workflow, spaceId);
    const inheritedIdentity = resolveInheritedWorkflowIdentity(
      originalRequest,
      workflow,
      {
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
      },
      identityContexts
    );
    if (inheritedIdentity) {
      await ensureInheritedBindingCurrent({ security }, inheritedIdentity, spaceId);
    }

    const authenticatedUser = await getAuthenticatedUser(request, security, elasticsearch);

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
    const packs = resolveWorkflowTaskPacks(
      taskManager,
      WORKFLOW_RUN_TASK_TYPE,
      workflowExecution.workflowDefinition
    );
    return {
      id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
      taskType: WORKFLOW_RUN_TASK_TYPE,
      params: {
        workflowRunId: workflowExecution.id,
        spaceId: workflowExecution.spaceId,
        ...(packs ? { packs } : {}),
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

  const scheduleDeps: ScheduleWorkflowRunTaskDeps = {
    taskManager,
    workflowExecutionRepository,
    logger,
  };

  const scheduleWorkflow: ScheduleWorkflow = async (workflow, context, originalRequest) => {
    const request = getWorkflowOriginalRequest(originalRequest, identityContexts);
    await checkLicense(licensing);

    const { workflowExecution } = await createAndPersistWorkflowExecution(
      workflow,
      context,
      'alert',
      request,
      { refresh: 'wait_for' }
    );

    if (workflowExecution.status === ExecutionStatus.FAILED) {
      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    }

    // Check concurrency limits and apply collision strategy if needed
    const canProceed = await checkConcurrencyIfNeeded(workflowExecution);
    if (!canProceed) {
      if (workflowExecution.id && workflowExecution.spaceId) {
        await handleConcurrencyBlockedExecution({
          workflowExecutionId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          request,
          workflowExecutionRepository,
          stepExecutionRepository,
          workflowTaskManager,
          internalResumeWorkflowExecution: getInternalResumeWorkflowExecution(),
          logger,
        });
      }
      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    }

    // Always schedule a task (never execute directly)
    const taskInstance = createTaskInstance(
      workflowExecution,
      generateExecutionTaskScope(workflowExecution as EsWorkflowExecution)
    );

    await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request);
    logger.debug(
      `Scheduling workflow task with user context for workflow ${workflow.id}, execution ${workflowExecution.id}`
    );

    return {
      workflowExecutionId: workflowExecution.id as string,
    };
  };

  /**
   * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
   * Normalizes the partial workflowExecution to build the workflow context needed for template evaluation.
   *
   * @param workflowExecution - The partial workflow execution
   * @param workflowSettings - The workflow settings from workflow definition
   * @returns The evaluated concurrency group key, or null if not applicable
   */
  const getConcurrencyGroupKey = (
    workflowExecution: Partial<EsWorkflowExecution>,
    workflowSettings: WorkflowSettings | undefined
  ): string | null => {
    if (!workflowSettings?.concurrency?.key) {
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
      buildWorkflowRenderContext(normalizedWorkflowExecution, kibanaUrlSource, { cloudSetup }),
      workflowSettings.liquid
    );
  };

  /**
   * Checks concurrency limits and applies collision strategy if needed.
   * This helper method consolidates the duplicated concurrency check logic.
   *
   * For 'drop' strategy: if limit is exceeded, ConcurrencyManager marks execution as SKIPPED.
   * For 'cancel-in-progress' strategy: ConcurrencyManager cancels old executions to make room.
   *
   * @param workflowExecution - The workflow execution (might be partial)
   * @returns Promise<boolean> - true if execution can proceed, false if it should be dropped
   */
  const checkConcurrencyIfNeeded = async (
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<boolean> => {
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
  };

  return {
    scheduleWorkflow,
    workflowTaskManager,
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository,
    concurrencyManager,
    scheduleDeps,
    checkConcurrencyIfNeeded,
    getConcurrencyGroupKey,
    ensureWorkflowEnabled,
    buildExecutionDocument,
    createAndPersistWorkflowExecution,
    createTaskInstance,
  };
};
