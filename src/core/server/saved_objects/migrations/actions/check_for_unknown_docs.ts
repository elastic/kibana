/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsRawDocSource } from '../../serialization';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface CheckForUnknownDocsParams {
  client: ElasticsearchClient;
  indexName: string;
  unusedTypesQuery: estypes.QueryDslQueryContainer;
  knownTypes: string[];
}

/** @internal */
export interface CheckForUnknownDocsFoundDoc {
  id: string;
  type: string;
}

/** @internal */
export interface UnknownDocsFound {
  type: 'unknown_docs_found';
  unknownDocs: CheckForUnknownDocsFoundDoc[];
}

export const checkForUnknownDocs =
  ({
    client,
    indexName,
    unusedTypesQuery,
    knownTypes,
  }: CheckForUnknownDocsParams): TaskEither.TaskEither<
    RetryableEsClientError | UnknownDocsFound,
    {}
  > =>
  () => {
    const query = createUnknownDocQuery(unusedTypesQuery, knownTypes);

    return client
      .search<SavedObjectsRawDocSource>({
        index: indexName,
        body: {
          query,
        },
      })
      .then((body) => {
        const { hits } = body.hits;
        if (hits.length) {
          return Either.left({
            type: 'unknown_docs_found' as const,
            unknownDocs: hits.map((hit) => ({ id: hit._id, type: hit._source?.type ?? 'unknown' })),
          });
        } else {
          return Either.right({});
        }
      })
      .catch(catchRetryableEsClientErrors);
  };

const createUnknownDocQuery = (
  unusedTypesQuery: estypes.QueryDslQueryContainer,
  knownTypes: string[]
): estypes.QueryDslQueryContainer => {
  return {
    bool: {
      must: unusedTypesQuery,
      must_not: knownTypes.map((type) => ({
        term: {
          type,
        },
      })),
    },
  };
};
