/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { errors as esErrors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../../../elasticsearch';
import type { SavedObjectsRawDoc } from '../../serialization';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { isWriteBlockException, isIndexNotFoundException } from './es_errors';
import { WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE } from './constants';
import type { TargetIndexHadWriteBlock, RequestEntityTooLargeException, IndexNotFound } from '.';

/**
 * Given a document and index, creates a valid body for the Bulk API.
 */
export const createBulkOperationBody = (doc: SavedObjectsRawDoc, index: string) => {
  return [
    {
      index: {
        _index: index,
        _id: doc._id,
        // overwrite existing documents
        op_type: 'index',
        // use optimistic concurrency control to ensure that outdated
        // documents are only overwritten once with the latest version
        if_seq_no: doc._seq_no,
        if_primary_term: doc._primary_term,
      },
    },
    doc._source,
  ];
};

/** @internal */
export interface BulkOverwriteTransformedDocumentsParams {
  client: ElasticsearchClient;
  index: string;
  transformedDocs: SavedObjectsRawDoc[];
  refresh?: estypes.Refresh;
}

/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export const bulkOverwriteTransformedDocuments =
  ({
    client,
    index,
    transformedDocs,
    refresh = false,
  }: BulkOverwriteTransformedDocumentsParams): TaskEither.TaskEither<
    | RetryableEsClientError
    | TargetIndexHadWriteBlock
    | IndexNotFound
    | RequestEntityTooLargeException,
    'bulk_index_succeeded'
  > =>
  () => {
    const body = transformedDocs.flatMap((doc) => {
      return createBulkOperationBody(doc, index);
    });

    return client
      .bulk({
        // Because we only add aliases in the MARK_VERSION_INDEX_READY step we
        // can't bulkIndex to an alias with require_alias=true. This means if
        // users tamper during this operation (delete indices or restore a
        // snapshot), we could end up auto-creating an index without the correct
        // mappings. Such tampering could lead to many other problems and is
        // probably unlikely so for now we'll accept this risk and wait till
        // system indices puts in place a hard control.
        require_alias: false,
        wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
        refresh,
        filter_path: ['items.*.error'],
        body,
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
