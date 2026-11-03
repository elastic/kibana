/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus, isWorkflowStepTriggered, WorkflowRepository } from '@kbn/workflows';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
import { handleConcurrencyBlockedExecution } from './concurrency/maybe_schedule_dormant_queued_run';
import type { WorkflowsExecutionEngineConfig } from './config';
import { cancelWorkflow, runWorkflow } from './execution_functions';
import { resumeWaitingWorkflowExecution } from './execution_functions/resume_waiting_workflow_execution';
import { checkLicense } from './lib/check_license';
import { UNKNOWN_EXECUTION_IDENTITY } from './lib/execution_identity';
import { getAuthenticatedUser } from './lib/get_user';
import { scheduleRunTaskOrMarkFailed } from './lib/schedule_workflow_run_task';
import { validateWorkflowInputs } from './lib/validate_workflow_inputs';
import type { WorkflowsMeteringService } from './metering/metering_service';
import { type DataClientBundle } from './repositories/data_access_layer';
import { LogsRepository } from './repositories/logs_repository';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import {
  checkConcurrencyIfNeeded,
  createBulkScheduleWorkflow,
  createScheduleWorkflow,
  createSchedulingHelpers,
} from './scheduling';
import type { SchedulingDeps } from './scheduling';
import { getWorkflowOriginalRequest } from './service_account_execution';
import { TriggerEventHandler } from './trigger_events';
import { initializeTriggerEventsClient } from './trigger_events/event_logs';
import { searchTriggerEventLog as querySearchTriggerEventLog } from './trigger_events/event_logs/trigger_event_log_query';
import type {
  CancelAllActiveWorkflowExecutions,
  CancelWorkflowExecution,
  ExecuteWorkflow,
  ExecuteWorkflowStep,
  InternalResumeWorkflowExecution,
  ResumeWorkflowExecution,
  ScheduleWorkflow,
  TriggerEventsContract,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import { generateExecutionTaskScope } from './utils';
import type { ContextDependencies } from './workflow_context_manager/types';
import { WorkflowLogsQueryService } from './workflow_event_logger';
import { WorkflowTaskManager } from './workflow_task_manager/workflow_task_manager';

/** Batch size for bulk cancel search_after paging (internal; not exposed on the public API). */
const BULK_CANCEL_PAGE_SIZE = 10;

/** The repositories over the workflow and step execution data clients. */
export const createScopedRepositories = (dataClientBundle: DataClientBundle) => ({
  workflowExecutionRepository: new WorkflowExecutionRepository(
    dataClientBundle.createWorkflowDataClient()
  ),
  stepExecutionRepository: new StepExecutionRepository(dataClientBundle.createStepDataClient()),
});

export interface WorkflowsEngineRuntimeDeps {
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  coreStart: ContextDependencies['coreStart'];
  plugins: Pick<
    WorkflowsExecutionEnginePluginStartDeps,
    'licensing' | 'taskManager' | 'workflowsExtensions' | 'actions' | 'spaces'
  >;
  dataClientBundle: DataClientBundle;
  setupDependencies: Pick<ContextDependencies, 'cloudSetup'>;
  meteringService?: WorkflowsMeteringService;
  /** Defaults to checking against the runtime's own concurrency manager. */
  checkConcurrencyIfNeeded?: (workflowExecution: Partial<EsWorkflowExecution>) => Promise<boolean>;
  /** The engine's own start contract, for runs that start inline (resolved once the engine started). */
  getEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
}

/**
 * The workflows engine once started: scheduling, execution, cancellation, resume and trigger
 * events over the execution storage. The plugin builds it in Kibana and a task pod's tasks entry
 * builds it on its own, so both run the same engine.
 */
export const createWorkflowsEngineRuntime = (deps: WorkflowsEngineRuntimeDeps) => {
  const {
    logger,
    config,
    coreStart,
    plugins,
    dataClientBundle,
    setupDependencies,
    meteringService,
  } = deps;
  // Set once the resume handler exists; the closures below read it when they run.
  const handlers: { internalResume?: InternalResumeWorkflowExecution } = {};
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  const workflowTaskManager = new WorkflowTaskManager(plugins.taskManager);
  const { workflowExecutionRepository, stepExecutionRepository } =
    createScopedRepositories(dataClientBundle);
  const workflowRepository = new WorkflowRepository({ esClient, logger });
  const concurrencyManager = new ConcurrencyManager(
    workflowTaskManager,
    workflowExecutionRepository
  );
  const checkConcurrency =
    deps.checkConcurrencyIfNeeded ??
    ((workflowExecution: Partial<EsWorkflowExecution>) =>
      checkConcurrencyIfNeeded({ concurrencyManager, logger }, workflowExecution));

  const dependencies: ContextDependencies = {
    ...setupDependencies,
    coreStart,
    actions: plugins.actions,
    taskManager: plugins.taskManager,
    workflowsExtensions: plugins.workflowsExtensions,
    config,
  };

  const schedulingDeps: SchedulingDeps = {
    coreStart,
    licensing: plugins.licensing,
    taskManager: plugins.taskManager,
    cloudSetup: setupDependencies.cloudSetup,
    config,
    logger,
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowTaskManager,
    concurrencyManager,
    getInternalResumeWorkflowExecution: () => handlers.internalResume,
  };
  const helpers = createSchedulingHelpers(schedulingDeps, {
    checkConcurrencyIfNeeded: (workflowExecution) => checkConcurrency(workflowExecution),
  });
  const {
    ensureWorkflowEnabled,
    buildExecutionDocument,
    createAndPersistWorkflowExecution,
    createTaskInstance,
    scheduleDeps,
  } = helpers;

  const executeWorkflow: ExecuteWorkflow = async (workflow, context, originalRequest) => {
    const request = getWorkflowOriginalRequest(originalRequest);
    await checkLicense(plugins.licensing);

    // AUTO-DETECT: Check if we're already running in a Task Manager context
    const isRunningInTaskManager =
      (context.triggeredBy as string | undefined) === 'scheduled' ||
      (context.source as string | undefined) === 'task-manager' ||
      request?.isFakeRequest === true;

    // Child executions (triggered by a workflow step) must always be scheduled in their own task,
    // never run inline in the parent's task. Otherwise the parent's runtime is blocked until the
    // child becomes idle, and cancel/timeout on the parent cannot take effect until then.
    const isChildExecution = isWorkflowStepTriggered(context.triggeredBy as string | undefined);

    if (!isRunningInTaskManager && !request) {
      throw new Error('Workflows cannot be executed without the user context');
    }

    // Test-only hook: simulate slow execution creation so Scout API tests
    // can deterministically reproduce the TOCTOU race in hardDeleteWorkflows.
    // Only honoured for internal API requests (KbnClient sets x-elastic-internal-origin).
    if (request?.isInternalApiRequest) {
      const raw = request.headers['x-kbn-test-run-delay-ms'];
      const delayMs = parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? '0'), 10);
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    const { workflowExecution } = await createAndPersistWorkflowExecution(
      workflow,
      context,
      'manual',
      originalRequest,
      { refresh: true }
    );

    if (workflowExecution.status === ExecutionStatus.FAILED) {
      return {
        workflowExecutionId: workflowExecution.id,
      };
    }

    const inputsValid = await validateWorkflowInputs(
      workflowExecution,
      workflowExecutionRepository,
      logger,
      coreStart,
      dependencies
    );
    if (!inputsValid) {
      return {
        workflowExecutionId: workflowExecution.id,
      };
    }

    // Check concurrency limits and apply collision strategy if needed
    const canProceed = await checkConcurrency(workflowExecution);
    if (!canProceed) {
      if (workflowExecution.id && workflowExecution.spaceId) {
        await handleConcurrencyBlockedExecution({
          workflowExecutionId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          request,
          workflowExecutionRepository,
          stepExecutionRepository,
          workflowTaskManager,
          internalResumeWorkflowExecution: handlers.internalResume,
          logger,
        });
      }
      return {
        workflowExecutionId: workflowExecution.id,
      };
    }

    if (isRunningInTaskManager && !isChildExecution) {
      // We're already in a task and this is not a child - execute directly without scheduling another task
      logger.debug(`Executing workflow directly (already in Task Manager context): ${workflow.id}`);

      const workflowsExecutionEngine = await deps.getEngine();

      await runWorkflow({
        workflowExecutionRepository,
        stepExecutionRepository,
        workflowRunId: workflowExecution.id,
        spaceId: workflowExecution.spaceId,
        signal: new AbortController().signal, // TODO: We need to think how to pass this properly from outer task
        logger,
        config,
        fakeRequest: request,
        dependencies,
        workflowsExecutionEngine,
        meteringService,
        internalResumeWorkflowExecution: handlers.internalResume,
      });
    } else {
      // Schedule a task: either we're not in a task, or this is a child execution (must not run inline)
      const taskInstance = createTaskInstance(workflowExecution, ['workflows']);
      await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request as KibanaRequest);
      logger.debug(
        `Scheduling workflow task for workflow ${workflow.id}, execution ${workflowExecution.id}${
          isChildExecution ? ' (child execution)' : ''
        }`
      );
    }

    return {
      workflowExecutionId: workflowExecution.id,
    };
  };

  const scheduleWorkflow: ScheduleWorkflow = createScheduleWorkflow(schedulingDeps, helpers);
  const bulkScheduleWorkflow = createBulkScheduleWorkflow(schedulingDeps, helpers);

  const executeWorkflowStep: ExecuteWorkflowStep = async (
    workflow,
    stepId,
    executionContext,
    contextOverride,
    request
  ) => {
    await checkLicense(plugins.licensing);
    if (workflow.definition?.settings?.run_as) {
      throw Boom.badRequest(
        'Service-account step tests could bypass the saved workflow control flow. Run the complete latest saved workflow instead.'
      );
    }

    const spaceId = workflow.spaceId || 'default';
    await ensureWorkflowEnabled(workflow, spaceId);
    const context: Record<string, unknown> = {
      ...(executionContext ?? {}),
      contextOverride,
      isUserInteractive: true,
    };

    const executedBy = await getAuthenticatedUser(
      request,
      coreStart.security,
      coreStart.elasticsearch.client
    );
    const workflowExecution = await buildExecutionDocument({
      workflow,
      spaceId,
      context,
      defaultTriggeredBy: 'manual',
      authenticatedUser: executedBy,
      now: new Date(),
    });
    workflowExecution.stepId = stepId;

    await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

    if (workflowExecution.status === ExecutionStatus.FAILED) {
      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    }

    const taskInstance = createTaskInstance(
      workflowExecution,
      generateExecutionTaskScope(workflowExecution as EsWorkflowExecution)
    );

    // Use Task Manager's first-class API key support by passing the request.
    // Clone so org/global UIAM keys are granted as TM-managed internal keys.
    // At this point, request is guaranteed to exist due to the early check above
    logger.debug(
      `Scheduling workflow step task with user context for workflow ${workflow.id}, step ${stepId}`
    );
    await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request);

    return {
      workflowExecutionId: workflowExecution.id as string,
    };
  };

  const cancelWorkflowExecution: CancelWorkflowExecution = async (
    workflowExecutionId,
    spaceId,
    schedulingRequest
  ) => {
    await checkLicense(plugins.licensing);

    await cancelWorkflow({
      workflowExecutionId,
      spaceId,
      schedulingRequest,
      workflowExecutionRepository,
      workflowTaskManager,
      logger,
    });
  };

  const cancelAllActiveWorkflowExecutions: CancelAllActiveWorkflowExecutions = async ({
    spaceId,
    workflowId,
    schedulingRequest,
    onCancelled,
  }) => {
    await checkLicense(plugins.licensing);

    let searchAfter: estypes.SortResults | undefined;

    do {
      const page = await workflowExecutionRepository.findNonTerminalExecutionIdsByWorkflowIdPage({
        spaceId,
        workflowId,
        size: BULK_CANCEL_PAGE_SIZE,
        searchAfter,
      });

      if (page.results.length === 0) {
        break;
      }

      const outcomes = await Promise.allSettled(
        page.results.map((id) => cancelWorkflowExecution(id, spaceId, schedulingRequest))
      );

      outcomes.forEach((outcome, index) => {
        const executionId = page.results[index];
        if (outcome.status === 'fulfilled') {
          onCancelled?.(executionId);
          return;
        }
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        logger.warn(
          `cancelAllActiveWorkflowExecutions: failed to cancel execution ${executionId}: ${message}`
        );
      });

      searchAfter = page.nextSearchAfter;
    } while (searchAfter !== undefined);
  };

  const resumeWorkflowExecution: ResumeWorkflowExecution = (
    executionId,
    spaceId,
    input,
    request,
    options
  ) =>
    resumeWaitingWorkflowExecution(
      {
        workflowExecutionRepository,
        workflowTaskManager,
        internalResumeWorkflowExecution,
        assertLicensed: () => checkLicense(plugins.licensing),
        resolveResumedBy: async (resumeRequest) =>
          resumeRequest
            ? (await getAuthenticatedUser(
                resumeRequest,
                coreStart.security,
                coreStart.elasticsearch.client
              )) ?? UNKNOWN_EXECUTION_IDENTITY
            : UNKNOWN_EXECUTION_IDENTITY,
        logger,
      },
      { executionId, spaceId, input, request, resumedBy: options?.resumedBy }
    );

  const internalResumeWorkflowExecution: InternalResumeWorkflowExecution = async (
    executionId,
    spaceId,
    context,
    request,
    options
  ) => {
    if (context) {
      await workflowExecutionRepository.updateWorkflowExecution({
        id: executionId,
        context,
      });
    }

    if (!request) {
      // External resume: wake the idle-timeout task created when entering WAITING_FOR_INPUT.
      // That task retains the workflow runner API key; ad-hoc tasks scheduled without a
      // request cannot be executed by workflow:resume (no fakeRequest at run time).
      await workflowTaskManager.runExistingResumeTask(executionId);
      return;
    }

    // Preserve the immediate runner's claim and durably retry wake-ups that
    // arrive while it is active.
    await workflowTaskManager.scheduleAndRunImmediateResume({
      executionId,
      spaceId,
      fakeRequest: request,
      isUserInteractive: options?.isUserInteractive,
      // Only a person's approval replaces the parked key. Wake and timer polls
      // resume this task without the flag and keep the stored key.
      regenerateApiKey: options?.isUserInteractive === true,
    });
  };

  handlers.internalResume = internalResumeWorkflowExecution;

  const logsRepository = new LogsRepository(coreStart.dataStreams, logger);
  const workflowEventLoggerService = new WorkflowLogsQueryService(logsRepository, logger);

  const triggerEventsClientPromise = initializeTriggerEventsClient(coreStart.dataStreams);

  const triggerEventHandler = new TriggerEventHandler({
    workflowExecutionRepository,
    coreStart,
    workflowRepository,
    workflowsExtensions: plugins.workflowsExtensions,
    spaces: plugins.spaces?.spacesService,
    scheduleWorkflow,
    logger,
    config: config.eventDriven,
    triggerEventsClientPromise,
  });

  const triggerEvents: TriggerEventsContract = {
    emitEvent: (params) => triggerEventHandler.handleEvent(params),
    isEnabled: config.eventDriven.enabled,
    isLogEventsEnabled: config.eventDriven.logEvents,
    maxEventChainDepth: config.eventDriven.maxChainDepth,
    searchTriggerEventLog: async (params) => {
      const triggerEventsClient = await triggerEventsClientPromise;
      return querySearchTriggerEventLog(triggerEventsClient, params);
    },
  };

  const contract: WorkflowsExecutionEnginePluginStart = {
    workflowEventLoggerService,
    executeWorkflow,
    executeWorkflowStep,
    scheduleWorkflow,
    bulkScheduleWorkflow,
    cancelWorkflowExecution,
    cancelAllActiveWorkflowExecutions,
    resumeWorkflowExecution,
    triggerEvents,
    serviceAccountBindings: coreStart.security.serviceAccounts,
    __internalStorage: {
      workflowExecutionsDataClient: dataClientBundle.createWorkflowDataClient(),
      stepExecutionsDataClient: dataClientBundle.createStepDataClient(),
    },
  };

  return { contract, internalResumeWorkflowExecution, concurrencyManager };
};
