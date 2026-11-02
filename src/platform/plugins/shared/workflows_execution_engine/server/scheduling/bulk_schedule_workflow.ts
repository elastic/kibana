/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  BulkScheduleWorkflowResult,
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { createSchedulingHelpers, type SchedulingHelpers } from './scheduling_helpers';
import type { SchedulingDeps } from './types';
import { maybeDrainConcurrencyQueueBeforeEnqueue } from '../concurrency/concurrency_queue_drainer';
import { handleConcurrencyBlockedExecution } from '../concurrency/maybe_schedule_dormant_queued_run';
import { checkLicense } from '../lib/check_license';
import { ensureBoundExecutionAdmitted } from '../lib/ensure_bound_execution_admitted';
import { getAuthenticatedUser } from '../lib/get_user';
import { checkWorkflowAccess } from '../lib/has_workflow_access';
import { bulkScheduleRunTasksOrMarkFailed } from '../lib/schedule_workflow_run_task';
import { refuseDelegatedIdentityWorkflow } from '../refuse_standalone_delegated_identity';
import { getWorkflowOriginalRequest } from '../service_account_execution';
import type { BulkScheduleWorkflow } from '../types';
import { generateExecutionTaskScope } from '../utils';

/** Builds `bulkScheduleWorkflow` from explicit dependencies (no plugin start contracts). */
export const createBulkScheduleWorkflow = (
  deps: SchedulingDeps,
  helpers: SchedulingHelpers = createSchedulingHelpers(deps)
): BulkScheduleWorkflow => {
  const {
    coreStart,
    licensing,
    logger,
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowTaskManager,
    getInternalResumeWorkflowExecution,
  } = deps;
  const {
    buildExecutionDocument,
    createTaskInstance,
    scheduleDeps,
    checkConcurrencyIfNeeded: checkConcurrencyIfNeededFor,
  } = helpers;

  return async (
    items: Array<{ workflow: WorkflowExecutionEngineModel; context: Record<string, unknown> }>,
    originalRequest: KibanaRequest
  ): Promise<BulkScheduleWorkflowResult> => {
    if (items.length === 0) {
      return [];
    }

    await checkLicense(licensing);
    const request = getWorkflowOriginalRequest(originalRequest);

    const authenticatedUser = await getAuthenticatedUser(
      request,
      coreStart.security,
      coreStart.elasticsearch.client
    );
    const now = new Date();

    const results: BulkScheduleWorkflowResult = new Array(items.length);

    const spaceIdFor = (item: (typeof items)[number]) =>
      (item.context.spaceId as string | undefined) || 'default';

    const enabledRefs = items
      .filter((item) => !item.workflow.isEphemeral)
      .map((item) => ({ workflowId: item.workflow.id, spaceId: spaceIdFor(item) }));
    const executionStates = await workflowRepository.getWorkflowExecutionStates(enabledRefs, {
      includeGlobal: true,
    });
    const hasPrivateWorkflows = [...executionStates.values()].some(
      ({ access_control }) => access_control?.access_mode === 'private'
    );
    const profileId = hasPrivateWorkflows
      ? (await coreStart.userProfile.getCurrentProfileId({ request })) ?? undefined
      : undefined;

    interface PreparedItem {
      idx: number;
      workflowExecution: Partial<EsWorkflowExecution>;
    }
    const prepared: PreparedItem[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      try {
        // Bulk scheduling never resolves a parent service account, so refuse before
        // the execution is written and before the later concurrency drain.
        refuseDelegatedIdentityWorkflow(item.workflow);
        const spaceId = spaceIdFor(item);
        if (!item.workflow.isEphemeral) {
          const state = executionStates.get(`${spaceId}:${item.workflow.id}`);
          if (
            state &&
            !checkWorkflowAccess(state, profileId, {
              core: coreStart,
              request,
              id: item.workflow.id,
              spaceId,
            })
          ) {
            throw new Error('You do not have permission to execute this workflow.');
          }
          if (!state?.enabled) {
            throw new Error(
              `Workflow is disabled: ${item.workflow.id}. Enable the workflow to run it.`
            );
          }
        }
        const workflowExecution = await buildExecutionDocument({
          workflow: item.workflow,
          spaceId,
          context: item.context,
          defaultTriggeredBy: 'alert',
          authenticatedUser,
          now,
        });
        prepared.push({ idx, workflowExecution });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results[idx] = { status: 'error', error: { message } };
      }
    }

    if (prepared.length === 0) {
      return results;
    }

    // Bulk write all prepared executions in a single _bulk call.
    // `refresh: 'wait_for'` matches the single-item scheduleWorkflow path
    // so downstream concurrency checks see the freshly-written docs.
    const bulkWriteResults = await workflowExecutionRepository.bulkCreateWorkflowExecutions(
      prepared.map((p) => p.workflowExecution),
      { refresh: 'wait_for' }
    );

    // Map per-doc bulk errors back to results; keep succeeded items for the
    // concurrency + task-scheduling passes.
    const succeeded: PreparedItem[] = [];
    for (let i = 0; i < prepared.length; i++) {
      const p = prepared[i];
      const writeResult = bulkWriteResults[i];
      if ('error' in writeResult) {
        results[p.idx] = {
          status: 'error',
          error: { message: writeResult.error },
        };
      } else {
        try {
          await ensureBoundExecutionAdmitted(
            p.workflowExecution,
            workflowRepository,
            workflowExecutionRepository
          );
          succeeded.push(p);
        } catch (error) {
          results[p.idx] = {
            status: 'error',
            error: { message: error instanceof Error ? error.message : String(error) },
          };
        }
      }
    }

    if (succeeded.length === 0) {
      return results;
    }

    // Every item with a persisted doc returns 'scheduled' with its id, regardless
    // of whether the concurrency check drops it (matches single-item scheduleWorkflow).
    for (const p of succeeded) {
      results[p.idx] = {
        status: 'scheduled',
        workflowExecutionId: p.workflowExecution.id as string,
      };
    }

    const runnable = succeeded.filter((p) => p.workflowExecution.status !== ExecutionStatus.FAILED);

    // Concurrency checks for items in the same group must run sequentially:
    // they read and mutate the same ES state, so running them in parallel
    // would let siblings in one batch see each other as "in flight" and,
    // with max=1 and strategy='drop', drop every item; with
    // 'cancel-in-progress' they would also race to cancel each other.
    // Items without a key, and items in different groups, stay parallel.
    const keylessItems: PreparedItem[] = [];
    const bucketsByGroup = new Map<string, PreparedItem[]>();
    for (const p of runnable) {
      const groupKey = p.workflowExecution.concurrencyGroupKey;
      if (!groupKey) {
        keylessItems.push(p);
      } else {
        const bucketKey = `${p.workflowExecution.spaceId ?? 'default'}:${groupKey}`;
        const existing = bucketsByGroup.get(bucketKey);
        if (existing) {
          existing.push(p);
        } else {
          bucketsByGroup.set(bucketKey, [p]);
        }
      }
    }

    const passingIdx = new Set<number>();
    const runCheck = async (p: PreparedItem) => {
      if (await checkConcurrencyIfNeededFor(p.workflowExecution)) {
        passingIdx.add(p.idx);
        return;
      }

      // `false` means the current execution was queued or terminalized before a task ran.
      // `cancel-in-progress` returns true for the new execution; cancelled older executions
      // resume sync parents through their own running task's normal cancellation path.
      await handleConcurrencyBlockedExecution({
        workflowExecutionId: p.workflowExecution.id as string,
        spaceId: p.workflowExecution.spaceId ?? 'default',
        request,
        workflowExecutionRepository,
        stepExecutionRepository,
        workflowTaskManager,
        internalResumeWorkflowExecution: getInternalResumeWorkflowExecution(),
        logger,
      });
    };
    await Promise.all([
      ...keylessItems.map(runCheck),
      ...Array.from(bucketsByGroup.values()).map(async (bucket) => {
        for (const p of bucket) {
          await maybeDrainConcurrencyQueueBeforeEnqueue({
            workflowExecution: p.workflowExecution,
            workflowExecutionRepository,
            workflowTaskManager,
            logger,
            failureLogLabel: 'Bulk concurrency queue drain failed',
          });
          await runCheck(p);
        }
      }),
    ]);

    const toSchedule = succeeded.filter((p) => passingIdx.has(p.idx));
    if (toSchedule.length > 0) {
      const tasks = toSchedule.map((p) =>
        createTaskInstance(
          p.workflowExecution,
          generateExecutionTaskScope(p.workflowExecution as EsWorkflowExecution)
        )
      );
      const { failedExecutionIds, message } = await bulkScheduleRunTasksOrMarkFailed(
        scheduleDeps,
        tasks,
        request
      );
      for (const { idx, workflowExecution } of toSchedule) {
        if (failedExecutionIds.has(workflowExecution.id as string)) {
          results[idx] = { status: 'error', error: { message } };
        }
      }
      logger.debug(`Bulk-scheduled ${toSchedule.length} workflow task(s) with user context`);
    }

    return results;
  };
};
