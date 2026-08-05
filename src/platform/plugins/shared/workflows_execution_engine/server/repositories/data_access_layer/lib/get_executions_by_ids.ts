/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { retryTransientEsErrors } from '../../../lib/retry_transient_es_errors';
import type {
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
} from '../types';

export interface GetExecutionsByIdsParams<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  ids: (string | { id: string; index: string[] })[];
  defaultIndex: string;
  options?: GetExecutionsByIdsOptions<TExecution>;
  normalizeExecutionOnGet?: (
    execution: TExecution,
    options?: GetExecutionsByIdsOptions<TExecution>
  ) => TExecution;
  logger: Logger;
}

export const getExecutionsByIds = async <TExecution extends { id: string }>({
  esClient,
  ids,
  defaultIndex,
  options,
  logger,
}: GetExecutionsByIdsParams<TExecution>): Promise<GetExecutionsByIdsResponse<TExecution>> => {
  if (ids.length === 0) {
    return {
      items: [],
      missing: [],
    };
  }

  const { sourceIncludes, sourceExcludes } = options ?? {};

  const sourceFilter =
    sourceIncludes?.length || sourceExcludes?.length
      ? {
          _source: {
            ...(sourceIncludes?.length ? { includes: sourceIncludes } : {}),
            ...(sourceExcludes?.length ? { excludes: sourceExcludes } : {}),
          },
        }
      : {};

  const docs = ids.flatMap((item) => {
    if (typeof item === 'string') {
      return { _index: defaultIndex, _id: item, ...sourceFilter };
    }
    return item.index.map((index) => ({ _index: index, _id: item.id, ...sourceFilter }));
  });
  const response = await retryTransientEsErrors(() => esClient.mget<TExecution>({ docs }), {
    logger,
  });

  const items: GetExecutionByIdsItem<TExecution>[] = [];

  for (const doc of response.docs) {
    if ('found' in doc && doc.found && doc._source) {
      const source = doc._source as TExecution;
      items.push({
        document: source,
        index: doc._index,
        seqNo: doc._seq_no,
        primaryTerm: doc._primary_term,
      });
    }
  }

  const foundIds = new Set(items.map((item) => item.document.id));

  return {
    items,
    missing: response.docs
      .filter((doc) => !('found' in doc && doc.found) && !foundIds.has(doc._id))
      .map((doc) => doc._id),
  };
};
