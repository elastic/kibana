/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { ExecutionSearchIncompleteError } from './types';
import type { ExecutionReadDeps, HasNonTerminalExecutionParams } from './types';

/**
 * Returns whether a workflow has a run that has not reached a terminal status.
 * Omit `spaceId` to search every space, which is required for a global managed definition.
 * That all-spaces search throws `ExecutionSearchIncompleteError` when it times out or a shard fails.
 */
export const hasNonTerminalExecution = async (
  deps: ExecutionReadDeps,
  { workflowId, spaceId }: HasNonTerminalExecutionParams
): Promise<boolean> => {
  if (spaceId === undefined) {
    const executions = await deps.workflowExecutionsDataClient.search({
      query: {
        bool: {
          filter: [
            { term: { workflowId } },
            { terms: { status: [...NonTerminalExecutionStatuses] } },
          ],
        },
      },
      size: 1,
      _source: false,
      allow_partial_search_results: false,
    });
    if (executions.timed_out || executions._shards.failed > 0) {
      throw new ExecutionSearchIncompleteError();
    }
    return executions.hits.hits.length > 0;
  }

  const page = await deps.workflowExecutionsDataClient.search({
    query: {
      bool: {
        must: [
          { term: { workflowId } },
          {
            bool: {
              should: [
                { term: { spaceId } },
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          },
          { terms: { status: [...NonTerminalExecutionStatuses] } },
        ],
      },
    },
    size: 1,
    track_total_hits: true,
  });
  const total = page.hits.total;
  const count = typeof total === 'number' ? total : total?.value ?? page.hits.hits.length;
  return count > 0;
};
