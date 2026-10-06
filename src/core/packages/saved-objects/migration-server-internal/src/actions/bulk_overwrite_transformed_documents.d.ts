/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
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
  /**
   * When true, call `_cluster/allocation/explain` on unavailable-shard failures
   * and include the decider reason in the returned error message. Callers
   * should gate this on retry count to avoid hitting the cluster API on every
   * retry of a long-running failure.
   */
  fetchAllocationExplain?: boolean;
}
/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export declare const bulkOverwriteTransformedDocuments: ({
  client,
  index,
  operations,
  refresh,
  useAliasToPreventAutoCreate,
  timeout,
  fetchAllocationExplain,
}: BulkOverwriteTransformedDocumentsParams) => TaskEither.TaskEither<
  | RetryableEsClientError
  | TargetIndexHadWriteBlock
  | IndexNotFound
  | RequestEntityTooLargeException
  | UnavailableShardsException,
  'bulk_index_succeeded'
>;
