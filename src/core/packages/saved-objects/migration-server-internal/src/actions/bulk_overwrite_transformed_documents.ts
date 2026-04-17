/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import type * as TaskEither from 'fp-ts/TaskEither';
import type { estypes } from '@elastic/elasticsearch';
import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import {
  isWriteBlockException,
  isIndexNotFoundException,
  isUnavailableShardsException,
} from './es_errors';
import { DEFAULT_TIMEOUT, WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE } from './constants';
import type {
  TargetIndexHadWriteBlock,
  RequestEntityTooLargeException,
  IndexNotFound,
  UnavailableShardsException,
} from '.';
import type { BulkOperation } from '../model/create_batches';

/** @internal */
export interface BulkOverwriteTransformedDocumentsParams {
  client: ElasticsearchClient;
  index: string;
  operations: BulkOperation[];
  refresh?: estypes.Refresh;
  /**
   * If true, we prevent Elasticsearch from auto-creating the index if it
   * doesn't exist. We use the ES paramater require_alias: true so `index`
   * must be an alias, otherwise the bulk index will fail.
   */
  useAliasToPreventAutoCreate?: boolean;
  /**
   * How long to wait for the request to complete, including waiting for
   * active shards. Defaults to DEFAULT_TIMEOUT (300s).
   */
  timeout?: string;
}

/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export const bulkOverwriteTransformedDocuments =
  ({
    client,
    index,
    operations,
    refresh = false,
    useAliasToPreventAutoCreate = false,
    timeout = DEFAULT_TIMEOUT,
  }: BulkOverwriteTransformedDocumentsParams): TaskEither.TaskEither<
    | RetryableEsClientError
    | TargetIndexHadWriteBlock
    | IndexNotFound
    | RequestEntityTooLargeException
    | UnavailableShardsException,
    'bulk_index_succeeded'
  > =>
  () => {
    return client
      .bulk({
        // Because we only add aliases in the MARK_VERSION_INDEX_READY step we
        // can't bulkIndex to an alias with require_alias=true. This means if
        // users tamper during this operation (delete indices or restore a
        // snapshot), we could end up auto-creating an index without the correct
        // mappings. Such tampering could lead to many other problems and is
        // probably unlikely so for now we'll accept this risk and wait till
        // system indices puts in place a hard control.
        index,
        require_alias: useAliasToPreventAutoCreate,
        wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
        refresh,
        timeout,
        filter_path: ['items.*.error'],
        // we need to unwrap the existing BulkIndexOperationTuple's
        operations: operations.flat(),
      })
      .then((res) => {
        // Filter out version_conflict_engine_exception since these just mean
        // that another instance already updated these documents
        const errors: estypes.ErrorCause[] = (res.items ?? [])
          .filter((item) => item.index?.error)
          .map((item) => item.index!.error!)
          .filter(({ type }) => type !== 'version_conflict_engine_exception');

        if (errors.length === 0) {
          return Either.right('bulk_index_succeeded' as const);
        } else {
          if (errors.every(isWriteBlockException)) {
            return Either.left({
              type: 'target_index_had_write_block' as const,
            });
          }
          if (errors.every(isIndexNotFoundException)) {
            return Either.left({
              type: 'index_not_found_exception' as const,
              index,
            });
          }
          if (errors.every(isUnavailableShardsException)) {
            return Either.left({
              type: 'unavailable_shards_exception' as const,
              message: `[${index}] Not enough active copies to meet shard count of [ALL]`,
            });
          }
          throw new Error(JSON.stringify(errors));
        }
      })
      .catch((error) => {
        if (error instanceof esErrors.ResponseError && error.statusCode === 413) {
          return Either.left({ type: 'request_entity_too_large_exception' as const });
        } else {
          throw error;
        }
      })
      .catch(catchRetryableEsClientErrors);
  };
