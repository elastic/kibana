/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Either from 'fp-ts/lib/Either';
import { IndexMapping } from '../../mappings';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
export type FetchIndexResponse = Record<
  string,
  { aliases: Record<string, unknown>; mappings: IndexMapping; settings: unknown }
>;

/** @internal */
export interface FetchIndicesParams {
  client: ElasticsearchClient;
  indices: string[];
}

/**
 * Fetches information about the given indices including aliases, mappings and
 * settings.
 */
export const fetchIndices =
  ({
    client,
    indices,
  }: FetchIndicesParams): TaskEither.TaskEither<RetryableEsClientError, FetchIndexResponse> =>
  // @ts-expect-error @elastic/elasticsearch IndexState.alias and IndexState.mappings should be required
  () => {
    return client.indices
      .get(
        {
          index: indices,
          ignore_unavailable: true, // Don't return an error for missing indices. Note this *will* include closed indices, the docs are misleading https://github.com/elastic/elasticsearch/issues/63607
        },
        { ignore: [404], maxRetries: 0 }
      )
      .then((body) => {
        return Either.right(body);
      })
      .catch(catchRetryableEsClientErrors);
  };
