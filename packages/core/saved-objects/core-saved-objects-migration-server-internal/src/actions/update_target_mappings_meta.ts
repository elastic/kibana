/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';

import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface UpdateTargetMappingsMetaParams {
  client: ElasticsearchClient;
  index: string;
  meta?: IndexMappingMeta;
}
/**
 * Updates an index's mappings _meta information
 */
export const updateTargetMappingsMeta =
  ({
    client,
    index,
    meta,
  }: UpdateTargetMappingsMetaParams): TaskEither.TaskEither<
    RetryableEsClientError,
    'update_mappings_meta_succeeded'
  > =>
  () => {
    return client.indices
      .putMapping({
        index,
        timeout: DEFAULT_TIMEOUT,
        _meta: meta || {},
      })
      .then(() => {
        // Ignore `acknowledged: false`. When the coordinating node accepts
        // the new cluster state update but not all nodes have applied the
        // update within the timeout `acknowledged` will be false. However,
        // retrying this update will always immediately result in `acknowledged:
        // true` even if there are still nodes which are falling behind with
        // cluster state updates.
        return Either.right('update_mappings_meta_succeeded' as const);
      })
      .catch(catchRetryableEsClientErrors);
  };
