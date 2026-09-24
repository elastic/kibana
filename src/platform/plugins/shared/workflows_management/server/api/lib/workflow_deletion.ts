/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { StorageClientBulkIndexOccMetadata } from '@kbn/storage-adapter';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import { buildWorkflowFilters } from '@kbn/workflows/server';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';

import { WorkflowConflictError } from '@kbn/workflows-yaml';
import { partitionBulkResults } from './bulk_response_helpers';
import type { WorkflowProperties, WorkflowStorage } from '../../storage/workflow_storage';
import { unscheduleWorkflowTasks } from '../../task_defs/unschedule_workflow_tasks';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';
import type { DeleteWorkflowsResponse } from '../workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../workflows_management_service';

type WorkflowStorageClient = ReturnType<WorkflowStorage['getClient']>;
interface WorkflowHit {
  _id?: string;
  _source?: WorkflowProperties;
  _seq_no?: number;
  _primary_term?: number;
}

const concurrencyMetadata = (hit: WorkflowHit): StorageClientBulkIndexOccMetadata =>
  hit._seq_no !== undefined && hit._primary_term !== undefined
    ? { if_seq_no: hit._seq_no, if_primary_term: hit._primary_term }
    : {};

const prepareWorkflowsForDeletion = async (
  hits: WorkflowHit[],
  client: WorkflowStorageClient
): Promise<string[]> => {
  const disableOperations = hits
    .filter(
      (hit): hit is { _id: string; _source: WorkflowProperties } =>
        Boolean(hit._id) &&
        Boolean(hit._source) &&
        (hit._source?.enabled === true || hit._source?.access_control?.access_mode === 'private')
    )
    .map((hit) => ({
      index: {
        _id: hit._id,
        ...concurrencyMetadata(hit),
        document: {
          ...(hit._source satisfies WorkflowProperties),
          enabled: false,
          ...(hit._source.access_control?.access_mode === 'private' && {
            deleted_at: hit._source.deleted_at ?? new Date(),
          }),
        },
      },
    }));

  if (disableOperations.length > 0) {
    const response = await client.bulk({ operations: disableOperations, refresh: true });
    return disableOperations
      .filter((_, i) => {
        const item = response.items[i]?.index;
        const status = item?.status ?? 0;
        const hit = hits.find((candidate) => candidate._id === disableOperations[i].index._id);
        if (status >= 200 && status < 300 && hit) {
          hit._seq_no = item?._seq_no;
          hit._primary_term = item?._primary_term;
          return true;
        }
        return false;
      })
      .map((op) => op.index._id);
  }

  return [];
};

const restoreDisabledWorkflows = async (
  hits: WorkflowHit[],
  disabledIds: string[],
  client: WorkflowStorageClient,
  logger: Logger
): Promise<void> => {
  if (disabledIds.length === 0) {
    return;
  }

  const restoreOperations = hits
    .filter(
      (hit): hit is { _id: string; _source: WorkflowProperties } =>
        Boolean(hit._id) && Boolean(hit._source) && disabledIds.includes(String(hit._id))
    )
    .map((hit) => ({
      index: {
        _id: hit._id,
        ...concurrencyMetadata(hit),
        document: hit._source satisfies WorkflowProperties,
      },
    }));

  if (restoreOperations.length > 0) {
    try {
      await client.bulk({ operations: restoreOperations, refresh: true });
    } catch (error) {
      logger.warn(
        `Failed to restore disabled workflows after hard-delete conflict: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

const purgeWorkflowRelatedData = async (
  workflowIds: string[],
  spaceId: string,
  workflowExecutionsDataClient: WorkflowExecutionsDataClient,
  stepExecutionsDataClient: StepExecutionsDataClient,
  { strict, logger }: { strict: boolean; logger: Logger }
): Promise<void> => {
  if (workflowIds.length === 0) {
    return;
  }

  const query = {
    bool: {
      must: [{ terms: { workflowId: workflowIds } }, { term: { spaceId } }],
    },
  };

  const deleteByQueryRequest = {
    query,
    refresh: true,
    conflicts: strict ? 'abort' : 'proceed',
  } as const;

  const purge = async (
    dataClient: WorkflowExecutionsDataClient | StepExecutionsDataClient,
    label: string
  ) => {
    try {
      const response = await dataClient.deleteByQuery(deleteByQueryRequest);
      if (
        strict &&
        (response.timed_out || response.version_conflicts || response.failures?.length)
      ) {
        throw new Error(
          `History cleanup incomplete: timed_out=${response.timed_out ?? false}, ` +
            `version_conflicts=${response.version_conflicts ?? 0}, ` +
            `failures=${response.failures?.length ?? 0}`
        );
      }
    } catch (error) {
      if (strict) throw error;
      logger.warn(
        `Failed to purge ${label} for workflows [${workflowIds.join(', ')}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  if (strict) {
    // Keep execution records until their steps are gone, and keep the ACL until both are gone.
    await purge(stepExecutionsDataClient, 'step executions');
    await purge(workflowExecutionsDataClient, 'executions');
  } else {
    await Promise.all([
      purge(workflowExecutionsDataClient, 'executions'),
      purge(stepExecutionsDataClient, 'step executions'),
    ]);
  }
};

const hardDeleteWorkflows = async (
  ids: string[],
  hits: WorkflowHit[],
  client: WorkflowStorageClient,
  spaceId: string,
  failures: Array<{ id: string; error: string }>,
  deps: {
    acknowledgeAclLoss?: boolean;
    workflowExecutionsDataClient: WorkflowExecutionsDataClient;
    stepExecutionsDataClient: StepExecutionsDataClient;
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
    getWorkflowExecutions: (
      params: SearchWorkflowExecutionsParams,
      sp: string
    ) => Promise<WorkflowExecutionListDto>;
  }
): Promise<DeleteWorkflowsResponse> => {
  const {
    workflowExecutionsDataClient,
    stepExecutionsDataClient,
    taskScheduler,
    logger,
    getWorkflowExecutions,
  } = deps;
  const foundIds = hits.map((hit) => hit._id).filter(Boolean) as string[];

  const privateIds = hits
    .filter((hit) => hit._source?.access_control?.access_mode === 'private')
    .map((hit) => hit._id)
    .filter((id): id is string => Boolean(id));
  if (privateIds.length > 0 && !deps.acknowledgeAclLoss) {
    throw new WorkflowConflictError(
      'Hard deletion removes workflow access controls. Any remaining execution data will use Workflows feature privileges. Set acknowledgeAclLoss=true to confirm.',
      privateIds[0]
    );
  }

  const disabledIds = await prepareWorkflowsForDeletion(hits, client);
  if (
    hits.some(
      (hit) =>
        hit._id &&
        (hit._source?.enabled || privateIds.includes(hit._id)) &&
        !disabledIds.includes(hit._id)
    )
  ) {
    await restoreDisabledWorkflows(hits, disabledIds, client, logger);
    throw new WorkflowConflictError('A workflow changed during deletion. Try again.', foundIds[0]);
  }

  let executionChecks: Array<{ id: string; hasRunning: boolean }>;
  try {
    executionChecks = await Promise.all(
      foundIds.map(async (id) => {
        const executions = await getWorkflowExecutions(
          { workflowId: id, statuses: [...NonTerminalExecutionStatuses], size: 1 },
          spaceId
        );
        return { id, hasRunning: executions.total > 0 };
      })
    );
  } catch (error) {
    await restoreDisabledWorkflows(hits, disabledIds, client, logger);
    throw error;
  }

  const runningIds = executionChecks.filter((c) => c.hasRunning).map((c) => c.id);
  if (runningIds.length > 0) {
    await restoreDisabledWorkflows(hits, disabledIds, client, logger);
    throw new WorkflowConflictError(
      `Cannot force-delete workflows with running executions: [${runningIds.join(', ')}]`,
      runningIds[0]
    );
  }

  try {
    await purgeWorkflowRelatedData(
      privateIds,
      spaceId,
      workflowExecutionsDataClient,
      stepExecutionsDataClient,
      { strict: true, logger }
    );
  } catch (error) {
    await restoreDisabledWorkflows(
      hits,
      disabledIds.filter((id) => !privateIds.includes(id)),
      client,
      logger
    );
    throw new WorkflowConflictError(
      `Could not delete workflow history. Workflow documents and access controls were retained. ` +
        `Private workflows remain soft-deleted and disabled. ${
          error instanceof Error ? error.message : String(error)
        }`,
      privateIds[0]
    );
  }

  const successfulIds: string[] = [];
  for (const hit of hits) {
    const id = hit._id;
    if (!id) throw new Error('Workflow document is missing its ID');
    try {
      await client.delete({ id, ...concurrencyMetadata(hit) });
      successfulIds.push(id);
    } catch (error) {
      failures.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await unscheduleWorkflowTasks(successfulIds, taskScheduler);
  await purgeWorkflowRelatedData(
    successfulIds.filter((id) => !privateIds.includes(id)),
    spaceId,
    workflowExecutionsDataClient,
    stepExecutionsDataClient,
    { strict: false, logger }
  );

  return {
    total: ids.length,
    deleted: successfulIds.length,
    failures,
    successfulIds,
  };
};

const softDeleteWorkflows = async (
  ids: string[],
  hits: WorkflowHit[],
  client: WorkflowStorageClient,
  failures: Array<{ id: string; error: string }>,
  deps: {
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
  }
): Promise<DeleteWorkflowsResponse> => {
  const now = new Date();
  const successfulIds: string[] = [];

  const validHits = hits.filter(
    (hit): hit is { _id: string; _source: WorkflowProperties } =>
      Boolean(hit._id) && Boolean(hit._source)
  );

  const bulkOperations = validHits.map((hit) => ({
    index: {
      _id: hit._id,
      ...concurrencyMetadata(hit),
      document: {
        ...(hit._source satisfies WorkflowProperties),
        deleted_at: now,
        enabled: false,
      },
    },
  }));

  if (bulkOperations.length > 0) {
    try {
      const bulkResponse = await client.bulk({
        operations: bulkOperations,
        refresh: true,
      });

      const { successIds, failures: bulkFailures } = partitionBulkResults(bulkResponse.items);
      successfulIds.push(...successIds);
      failures.push(...bulkFailures);

      await unscheduleWorkflowTasks(successfulIds, deps.taskScheduler);
    } catch (error) {
      bulkOperations.forEach((op) => {
        failures.push({
          id: op.index._id ?? 'unknown',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  return {
    total: ids.length,
    deleted: successfulIds.length,
    failures,
    successfulIds,
  };
};

/**
 * Deletes workflows by IDs. Dispatches to soft or hard delete based on the `force` option.
 */
export const deleteWorkflows = async (params: {
  ids: string[];
  spaceId: string;
  force: boolean;
  acknowledgeAclLoss?: boolean;
  assertCanDelete?: (workflow: WorkflowProperties) => void;
  storage: WorkflowStorage;
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  taskScheduler: WorkflowTaskScheduler | null;
  logger: Logger;
  getWorkflowExecutions: (
    p: SearchWorkflowExecutionsParams,
    sp: string
  ) => Promise<WorkflowExecutionListDto>;
}): Promise<DeleteWorkflowsResponse> => {
  const {
    ids,
    spaceId,
    force,
    storage,
    workflowExecutionsDataClient,
    stepExecutionsDataClient,
    taskScheduler,
    logger,
    getWorkflowExecutions,
  } = params;
  const failures: Array<{ id: string; error: string }> = [];
  const client = storage.getClient();

  const { must } = buildWorkflowFilters({
    ids,
    space: { id: spaceId },
  });
  const searchResponse = await client.search({
    query: { bool: { must } },
    size: ids.length,
    track_total_hits: false,
    seq_no_primary_term: true,
  });

  const hits = searchResponse.hits.hits;
  for (const hit of hits) {
    if (hit._source) params.assertCanDelete?.(hit._source);
  }

  if (force) {
    return hardDeleteWorkflows(ids, hits, client, spaceId, failures, {
      acknowledgeAclLoss: params.acknowledgeAclLoss,
      workflowExecutionsDataClient,
      stepExecutionsDataClient,
      taskScheduler,
      logger,
      getWorkflowExecutions,
    });
  }

  return softDeleteWorkflows(ids, hits, client, failures, { taskScheduler, logger });
};
