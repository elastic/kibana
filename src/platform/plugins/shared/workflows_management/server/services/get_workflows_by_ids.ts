/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { buildWorkflowFilters } from '@kbn/workflows/server/lib/workflow_filters';
import { transformStorageDocumentToWorkflowDto } from '../api/lib/workflow_dto_transform';
import type { WorkflowStorage } from '../storage/workflow_storage';

/**
 * Reads workflows by id from the `.workflows-workflows` storage, for one space.
 *
 * Kept in its own small module (no YAML, zod schema or actions-schema imports) so it can be used
 * outside the plugin, e.g. from a task pod.
 */
export async function getWorkflowsByIds(
  storage: Pick<WorkflowStorage, 'getClient'>,
  ids: string[],
  spaceId: string,
  options?: { includeDeleted?: boolean; includeGlobal?: boolean }
): Promise<WorkflowDetailDto[]> {
  if (ids.length === 0) {
    return [];
  }

  const { must, must_not } = buildWorkflowFilters({
    ids,
    space: { id: spaceId, includeGlobal: options?.includeGlobal ?? true },
    deleted: options?.includeDeleted ? 'all' : 'not_deleted',
  });

  const response = await storage.getClient().search({
    query: { bool: { must, must_not } },
    size: ids.length,
    track_total_hits: false,
    allow_partial_search_results: false,
  });
  if (response.timed_out || response._shards.failed > 0) {
    throw new Error('Could not determine workflow access from an incomplete search.');
  }

  return response.hits.hits.map((hit) =>
    transformStorageDocumentToWorkflowDto(hit._id, hit._source)
  );
}
