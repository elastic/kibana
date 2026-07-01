/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

const RECENT_BACKING_INDEX_LOOKUP_COUNT = 3;

export interface DataStreamDocument<TDocument> {
  id: string;
  index: string;
  doc: TDocument;
}

export const mgetRecentBackingIndicesThenSearch = async <TDocument>({
  esClient,
  dataStream,
  ids,
  sourceIncludes,
  sourceExcludes,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  ids: string[];
  sourceIncludes?: string[];
  sourceExcludes?: string[];
}): Promise<Array<DataStreamDocument<TDocument>>> => {
  if (ids.length === 0) {
    return [];
  }

  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: dataStream,
  });
  const recentBackingIndices =
    dataStreams[0]?.indices
      .map((index) => index.index_name)
      .filter((indexName): indexName is string => Boolean(indexName))
      .slice(-RECENT_BACKING_INDEX_LOOKUP_COUNT)
      .reverse() ?? [];

  const resultsById = new Map<string, DataStreamDocument<TDocument>>();

  if (recentBackingIndices.length > 0) {
    const mgetResponse = await esClient.mget<TDocument>({
      docs: recentBackingIndices.flatMap((index) =>
        ids.map((id) => ({
          _index: index,
          _id: id,
        }))
      ),
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    for (const hit of mgetResponse.docs) {
      if ('found' in hit && hit.found && hit._source && !resultsById.has(hit._id)) {
        resultsById.set(hit._id, {
          id: hit._id,
          index: hit._index,
          doc: hit._source,
        });
      }
    }
  }

  const missingIds = ids.filter((id) => !resultsById.has(id));
  if (missingIds.length > 0) {
    const searchResponse = await esClient.search<TDocument>({
      index: dataStream,
      query: { ids: { values: missingIds } },
      size: Math.min(missingIds.length, 10000),
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    for (const hit of searchResponse.hits.hits) {
      if (hit._id && hit._source && !resultsById.has(hit._id)) {
        resultsById.set(hit._id, {
          id: hit._id,
          index: hit._index,
          doc: hit._source,
        });
      }
    }
  }

  return ids.flatMap((id) => {
    const result = resultsById.get(id);
    return result ? [result] : [];
  });
};

export const getExecutionByIdFromDataStream = async ({
  esClient,
  dataStream,
  id,
  spaceId,
  sourceIncludes,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  id: string;
  spaceId: string;
  sourceIncludes?: string[];
}): Promise<EsWorkflowExecution | null> => {
  const [result] = (
    await mgetRecentBackingIndicesThenSearch<EsWorkflowExecution>({
      esClient,
      dataStream,
      ids: [id],
      sourceIncludes,
    })
  ).filter(({ doc }) => doc.spaceId === spaceId);

  return result?.doc ?? null;
};

export const getStepExecutionsByIdsFromDataStream = async ({
  esClient,
  dataStream,
  ids,
  sourceExcludes,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  ids: string[];
  sourceExcludes?: string[];
}): Promise<EsWorkflowStepExecution[]> => {
  const results = await mgetRecentBackingIndicesThenSearch<EsWorkflowStepExecution>({
    esClient,
    dataStream,
    ids,
    sourceExcludes,
  });

  return results.map(({ doc }) => doc);
};
