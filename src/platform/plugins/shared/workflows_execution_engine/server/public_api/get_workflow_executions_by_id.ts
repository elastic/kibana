/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { isIndexNotFoundError } from './lib/query';
import type { ExecutionReadDeps, GetWorkflowExecutionsByIdParams } from './types';

/**
 * Returns workflow executions for the given ids in one space, in request order.
 * An id with no document, or a document in another space, is left out.
 * An empty id list returns an empty list and does not query. A missing index returns an empty list.
 */
export const getWorkflowExecutionsById = async (
  deps: ExecutionReadDeps,
  { ids, spaceId, sourceIncludes, sourceExcludes }: GetWorkflowExecutionsByIdParams
): Promise<EsWorkflowExecution[]> => {
  if (ids.length === 0) {
    return [];
  }

  const includesSpaceId = !sourceIncludes || sourceIncludes.includes('spaceId');
  const includes = sourceIncludes
    ? includesSpaceId
      ? [...sourceIncludes]
      : [...sourceIncludes, 'spaceId' as const]
    : undefined;

  try {
    const { items } = await deps.workflowExecutionsDataClient.getByIds([...ids], {
      sourceIncludes: includes,
      sourceExcludes: sourceExcludes ? [...sourceExcludes] : undefined,
    });
    return items.flatMap(({ document }) => {
      if (document.spaceId !== spaceId) {
        return [];
      }
      if (includesSpaceId) {
        return [document];
      }
      const { spaceId: _spaceId, ...rest } = document;
      return [rest as EsWorkflowExecution];
    });
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};
