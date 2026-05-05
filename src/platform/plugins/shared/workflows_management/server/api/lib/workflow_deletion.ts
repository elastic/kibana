/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionListDto } from '@kbn/workflows';

import { WorkflowConflictError } from '@kbn/workflows-yaml';
import { partitionBulkResults } from './bulk_response_helpers';
import { workflowSpaceFilter } from './workflow_query_filters';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';
import type { WorkflowProperties, WorkflowStorage } from '../../storage/workflow_storage';
import { unscheduleWorkflowTasks } from '../../task_defs/unschedule_workflow_tasks';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';
import type { DeleteWorkflowsResponse } from '../workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../workflows_management_service';

type WorkflowStorageClient = ReturnType<WorkflowStorage['getClient']>;
interface WorkflowHit {
  _id?: string;
  _source?: WorkflowProperties;
}

const disableWorkflowsForDeletion = async (
  hits: WorkflowHit[],
  client: WorkflowStorageClient
): Promise<string[]> => {
  const disableOperations = hits
    .filter(
      (hit): hit is { _id: string; _source: WorkflowProperties } =>
        Boolean(hit._id) && Boolean(hit._source) && hit._source?.enabled === true
    )
    .map((hit) => ({
      index: {
        _id: hit._id,
        document: {
          ...(hit._source satisfies WorkflowProperties),
          enabled: false,
        },
      },
    }));

  if (disableOperations.length > 0) {
    const response = await client.bulk({ operations: disableOperations, refresh: true });
    return disableOperations
      .filter((_, i) => {
        const status = response.items[i]?.index?.status ?? 0;
        return status >= 200 && status < 300;
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
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  if (workflowIds.length === 0) {
    return;
  }

  const query = {
    bool: {
      must: [{ terms: { workflowId: workflowIds } }, { term: { spaceId } }],
    },
  };

  const deleteOps = [
    esClient
      .deleteByQuery({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query,
        refresh: true,
        conflicts: 'proceed',
      })
      .catch((error) => {
        logger.warn(
          `Failed to purge executions for workflows [${workflowIds.join(', ')}]: ${error.message}`
        );
      }),
    esClient
      .deleteByQuery({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query,
        refresh: true,
        conflicts: 'proceed',
      })
      .catch((error) => {
        logger.warn(
          `Failed to purge step executions for workflows [${workflowIds.join(', ')}]: ${
            error.message
          }`
        );
      }),
  ];

  await Promise.allSettled(deleteOps);
};

const hardDeleteWorkflows = async (
  ids: string[],
  hits: WorkflowHit[],
  client: WorkflowStorageClient,
  spaceId: string,
  failures: Array<{ id: string; error: string }>,
  deps: {
    esClient: ElasticsearchClient;
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
    getWorkflowExecutions: (
      params: SearchWorkflowExecutionsParams,
      sp: string
    ) => Promise<WorkflowExecutionListDto>;
  }
): Promise<DeleteWorkflowsResponse> => {
  const { esClient, taskScheduler, logger, getWorkflowExecutions } = deps;
  const foundIds = hits.map((hit) => hit._id).filter(Boolean) as string[];

  const disabledIds = await disableWorkflowsForDeletion(hits, client);

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

  const successfulIds: string[] = [];
  for (const id of foundIds) {
    try {
      await client.delete({ id });
      successfulIds.push(id);
    } catch (error) {
      failures.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await unscheduleWorkflowTasks(successfulIds, taskScheduler, logger);
  await purgeWorkflowRelatedData(successfulIds, spaceId, esClient, logger);

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

      await unscheduleWorkflowTasks(successfulIds, deps.taskScheduler, deps.logger);
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
  storage: WorkflowStorage;
  esClient: ElasticsearchClient;
  taskScheduler: WorkflowTaskScheduler | null;
  logger: Logger;
  getWorkflowExecutions: (
    p: SearchWorkflowExecutionsParams,
    sp: string
  ) => Promise<WorkflowExecutionListDto>;
}): Promise<DeleteWorkflowsResponse> => {
  const { ids, spaceId, force, storage, esClient, taskScheduler, logger, getWorkflowExecutions } =
    params;
  const failures: Array<{ id: string; error: string }> = [];
  const client = storage.getClient();

  const { must } = workflowSpaceFilter(spaceId, { includeDeleted: true });
  must.push({ ids: { values: ids } });
  const searchResponse = await client.search({
    query: { bool: { must } },
    size: ids.length,
    track_total_hits: false,
  });

  const hits = searchResponse.hits.hits;

  if (force) {
    return hardDeleteWorkflows(ids, hits, client, spaceId, failures, {
      esClient,
      taskScheduler,
      logger,
      getWorkflowExecutions,
    });
  }

  return softDeleteWorkflows(ids, hits, client, failures, { taskScheduler, logger });
};
