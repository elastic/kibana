/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsRawDocSource } from '../../serialization';
import type { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface CheckForUnknownDocsParams {
  client: ElasticsearchClient;
  indexName: string;
  excludeOnUpgradeQuery: QueryDslQueryContainer;
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
    excludeOnUpgradeQuery,
    knownTypes,
  }: CheckForUnknownDocsParams): TaskEither.TaskEither<
    RetryableEsClientError,
    UnknownDocsFound | {}
  > =>
  () => {
    const query = createUnknownDocQuery(excludeOnUpgradeQuery, knownTypes);
    return client
      .search<SavedObjectsRawDocSource>({
        index: indexName,
        body: {
          size: 1000,
          query,
        },
      })
      .then((body) => {
        const { hits } = body.hits;
        if (!hits.length) {
          return Either.right({});
        }

        return Either.right({
          type: 'unknown_docs_found' as const,
          unknownDocs: hits.map((hit) => ({
            id: hit._id,
            type: hit._source?.type ?? 'unknown',
          })),
        });
      })
      .catch(catchRetryableEsClientErrors);
  };

const createUnknownDocQuery = (
  excludeOnUpgradeQuery: QueryDslQueryContainer,
  knownTypes: string[]
): QueryDslQueryContainer => {
  return {
    bool: {
      must: excludeOnUpgradeQuery,
      must_not: knownTypes.map((type) => ({
        term: {
          type,
        },
      })),
    },
  };
};
