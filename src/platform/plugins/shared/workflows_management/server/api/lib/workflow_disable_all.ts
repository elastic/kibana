/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

import { partitionBulkResults } from './bulk_response_helpers';
import { paginateWithSearchAfter } from './paginate_with_search_after';
import { updateWorkflowYamlFields } from '../../../common/lib/yaml';
import type { WorkflowProperties, WorkflowStorage } from '../../storage/workflow_storage';
import { unscheduleWorkflowTasks } from '../../task_defs/unschedule_workflow_tasks';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';

/**
 * Disables all enabled workflows. When `spaceId` is set, scopes the operation
 * to that space; otherwise operates across all spaces. Sets `enabled: false`,
 * patches YAML accordingly, and unschedules any scheduled tasks.
 * Used when a user opts out of workflows by toggling the per-space UI setting off,
 * or when availability (license / config) requires a global bulk disable.
 */
export const disableAllWorkflows = async (params: {
  storage: WorkflowStorage;
  taskScheduler: WorkflowTaskScheduler | null;
  logger: Logger;
  spaceId?: string;
}): Promise<{
  total: number;
  disabled: number;
  failures: Array<{ id: string; error: string }>;
}> => {
  const { storage, taskScheduler, logger, spaceId } = params;
  const client = storage.getClient();
  const pageSize = 1000;
  const failures: Array<{ id: string; error: string }> = [];
  const disabledIds: string[] = [];

  const query = {
    bool: {
      must: [{ term: { enabled: true } }, ...(spaceId ? [{ term: { spaceId } }] : [])],
      must_not: [{ exists: { field: 'deleted_at' } }],
    },
  };
  const sort = [{ updated_at: { order: 'desc' as const } }, '_shard_doc'];

  const { totalProcessed } = await paginateWithSearchAfter<WorkflowProperties>(
    {
      search: (searchAfter) =>
        client.search({
          query,
          size: pageSize,
          sort,
          _source: true,
          track_total_hits: false,
          ...(searchAfter ? { search_after: searchAfter } : {}),
        }),
      pageSize,
      logger,
      operationName: 'disableAllWorkflows',
    },
    async (hits) => {
      const bulkOperations = hits.map((hit) => {
        const updatedYaml = updateWorkflowYamlFields(hit._source.yaml, { enabled: false }, false);
        return {
          index: {
            _id: hit._id,
            document: {
              ...hit._source,
              enabled: false,
              yaml: updatedYaml,
            },
          },
        };
      });

      try {
        const bulkResponse = await client.bulk({
          operations: bulkOperations,
          refresh: true,
        });

        const { successIds: pageDisabledIds, failures: bulkFailures } = partitionBulkResults(
          bulkResponse.items
        );
        failures.push(...bulkFailures);

        if (pageDisabledIds.length > 0) {
          disabledIds.push(...pageDisabledIds);
          await unscheduleWorkflowTasks(pageDisabledIds, taskScheduler, logger);
        }
      } catch (error) {
        bulkOperations.forEach((op) => {
          failures.push({
            id: op.index._id ?? 'unknown',
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }
  );

  logger.info(
    `Disabled ${disabledIds.length} workflows${
      spaceId ? ` in space ${spaceId}` : ' across all spaces'
    } (${failures.length} failures)`
  );

  return {
    total: totalProcessed,
    disabled: disabledIds.length,
    failures,
  };
};
