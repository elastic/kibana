/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { flatten } from 'lodash';
import type {
  AggregationsMultiBucketAggregateBase,
  Indices,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { addExcludedTypesToBoolQuery } from '../model/helpers';

/** @internal */
export interface CheckForUnknownDocsParams {
  client: ElasticsearchClient;
  indexName: string;
  excludeOnUpgradeQuery: QueryDslQueryContainer;
  knownTypes: string[];
}

/** @internal */
export interface DocumentIdAndType {
  id: string;
  type: string;
}

/** @internal */
export interface UnknownDocsFound {
  type: 'unknown_docs_found';
  unknownDocs: DocumentIdAndType[];
}

/**
 * Performs a search in ES, aggregating documents by type, retrieving a bunch
 * of documents for each type.
 *
 * @internal
 * @param esClient The ES client to perform the search query
 * @param targetIndices The ES indices to target
 * @param query An optional query that can be used to filter
 * @returns A list of documents with their types
 */
export async function getAggregatedTypesDocuments(
  esClient: ElasticsearchClient,
  targetIndices: Indices,
  query?: QueryDslQueryContainer
): Promise<DocumentIdAndType[]> {
  const params: SearchRequest = {
    index: targetIndices,
    size: 0,
    // apply the desired filters (e.g. filter out registered types)
    query,
    // aggregate docs by type, so that we have a sneak peak of all types
    aggs: {
      typesAggregation: {
        terms: {
          // assign type __UNKNOWN__ to those documents that don't define one
          missing: '__UNKNOWN__',
          field: 'type',
          size: 1000, // collect up to 1000 types
        },
        aggs: {
          docs: {
            top_hits: {
              size: 100, // collect up to 100 docs for each type
              _source: {
                excludes: ['*'],
              },
            },
          },
        },
      },
    },
  };

  const body = await esClient.search<SavedObjectsRawDocSource>(params);

  if (!body.aggregations) return [];

  const { typesAggregation } = body.aggregations;
  const buckets = (typesAggregation as AggregationsMultiBucketAggregateBase).buckets;

  const bucketsArray = Array.isArray(buckets) ? buckets : Object.values(buckets);

  return flatten(
    bucketsArray.map(
      (bucket: any) =>
        bucket.docs?.hits?.hits?.map((doc: any) => ({
          id: doc._id,
          type: bucket.key,
        })) || []
    )
  );
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
    const excludeQuery = addExcludedTypesToBoolQuery(knownTypes, excludeOnUpgradeQuery.bool);
    return getAggregatedTypesDocuments(client, indexName, excludeQuery)
      .then((unknownDocs) => {
        if (unknownDocs.length) {
          return Either.right({ type: 'unknown_docs_found' as const, unknownDocs });
        }

        return Either.right({});
      })
      .catch(catchRetryableEsClientErrors);
  };
