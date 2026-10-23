/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { isIndexNotFoundError } from './lib/query';
import type { ExecutionReadDeps, GetStepExecutionsByIdsParams } from './types';

/**
 * Returns step executions for the given ids in one space, in request order.
 * An id with no document, or a document in another space, is left out.
 * An empty id list returns an empty list and does not query. A missing index returns an empty list.
 * `sourceIncludes` limits `_source`. `includeInput: false` or `includeOutput: false` drops that field.
 * `spaceId` is always fetched for the space check and removed from the result when the caller did not ask for it.
 */
export const getStepExecutionsByIds = async (
  deps: ExecutionReadDeps,
  {
    ids,
    spaceId,
    sourceIncludes,
    sourceExcludes,
    includeInput,
    includeOutput,
  }: GetStepExecutionsByIdsParams
): Promise<EsWorkflowStepExecution[]> => {
  if (ids.length === 0) {
    return [];
  }

  const callerPassedIncludes = sourceIncludes !== undefined;
  const returnSpaceId =
    (!callerPassedIncludes || sourceIncludes.includes('spaceId')) &&
    !sourceExcludes?.includes('spaceId');

  const includes = callerPassedIncludes
    ? new Set<Extract<keyof EsWorkflowStepExecution, string>>(sourceIncludes)
    : undefined;
  const excludes = new Set<Extract<keyof EsWorkflowStepExecution, string>>(sourceExcludes ?? []);

  if (includes && !includes.has('spaceId')) {
    includes.add('spaceId');
  }
  excludes.delete('spaceId');

  if (includeInput === false) {
    excludes.add('input');
    includes?.delete('input');
  } else if (includeInput === true) {
    excludes.delete('input');
  }

  if (includeOutput === false) {
    excludes.add('output');
    includes?.delete('output');
  } else if (includeOutput === true) {
    excludes.delete('output');
  }

  try {
    const { items } = await deps.stepExecutionsDataClient.getByIds([...ids], {
      sourceIncludes: includes && includes.size > 0 ? [...includes] : undefined,
      sourceExcludes: excludes.size > 0 ? [...excludes] : undefined,
    });

    return items.flatMap(({ document }) => {
      if (document.spaceId !== spaceId) {
        return [];
      }
      if (returnSpaceId) {
        return [document];
      }
      const { spaceId: _spaceId, ...rest } = document;
      return [rest as EsWorkflowStepExecution];
    });
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};
