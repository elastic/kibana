/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionListDto } from '@kbn/workflows';
import { pickWorkflowDocumentVersion } from '@kbn/workflows';
import { asBadQueryError, emptyExecutionList, hitTotal, isIndexNotFoundError } from './query';
import type { WorkflowExecutionsDataClient } from '../../repositories/data_access_layer';

/** Fields required to build a list item without the full execution snapshot. */
export const WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES = [
  'spaceId',
  'stepId',
  'status',
  'error',
  'isTestRun',
  'startedAt',
  'finishedAt',
  'duration',
  'workflowId',
  'triggeredBy',
  'executedBy',
  'effectiveIdentity',
  'createdBy',
  'concurrencyGroupKey',
  'managed',
  'managedBy',
  'originManagedWorkflowId',
  'managedVersion',
  'version',
  'workflowDefinition.name',
  'workflowDefinition.tags',
] as const;

export const DEFAULT_EXECUTION_SORT: estypes.Sort = [{ createdAt: 'desc' }, { id: 'desc' }];

export const searchExecutionDocuments = async ({
  client,
  logger,
  query,
  sort = DEFAULT_EXECUTION_SORT,
  collapse,
  size,
  from,
  page,
  searchAfter,
}: {
  client: WorkflowExecutionsDataClient;
  logger: Logger;
  query: estypes.QueryDslQueryContainer;
  sort?: estypes.Sort;
  collapse?: { field: string };
  size: number;
  from?: number;
  page: number;
  searchAfter?: readonly unknown[];
}): Promise<WorkflowExecutionListDto> => {
  try {
    logger.debug('Searching workflow executions');
    const response = await client.search({
      query,
      _source: { includes: [...WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES] },
      sort,
      size,
      ...(searchAfter && searchAfter.length > 0
        ? { search_after: [...searchAfter] as estypes.FieldValue[] }
        : { from }),
      collapse,
      track_total_hits: true,
    });
    return toExecutionList(response, page, size);
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return emptyExecutionList(page, size);
    }
    const queryError = asBadQueryError(error);
    if (queryError) {
      throw queryError;
    }
    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

const toExecutionList = (
  response: estypes.SearchResponse<EsWorkflowExecution>,
  page: number,
  size: number
): WorkflowExecutionListDto => {
  const results = response.hits.hits.reduce<WorkflowExecutionListDto['results']>((acc, hit) => {
    const source = hit._source;
    const id = hit._id;
    if (id != null && source != null) {
      acc.push({
        spaceId: source.spaceId,
        id,
        managed: source.managed,
        managedBy: source.managedBy,
        originManagedWorkflowId: source.originManagedWorkflowId,
        managedVersion: source.managedVersion,
        stepId: source.stepId,
        status: source.status,
        error: source.error || null,
        isTestRun: source.isTestRun ?? false,
        startedAt: source.startedAt,
        finishedAt: source.finishedAt,
        duration: source.duration,
        workflowId: source.workflowId,
        workflowName: source.workflowDefinition?.name,
        tags: source.workflowDefinition?.tags,
        triggeredBy: source.triggeredBy,
        effectiveIdentity: source.effectiveIdentity,
        executedBy: source.executedBy ?? source.createdBy,
        concurrencyGroupKey: source.concurrencyGroupKey,
        ...pickWorkflowDocumentVersion(source),
      });
    }
    return acc;
  }, []);

  const lastHit = response.hits.hits[response.hits.hits.length - 1];
  const nextSearchAfter =
    results.length >= size && lastHit?.sort != null ? [...lastHit.sort] : undefined;

  return {
    results,
    size,
    page,
    total: hitTotal(response.hits.total),
    ...(nextSearchAfter ? { searchAfter: nextSearchAfter } : {}),
  };
};
