/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound } from '.';
export interface AliasNotFound {
  type: 'alias_not_found_exception';
}
/** @internal */
export interface RemoveIndexNotAConcreteIndex {
  type: 'remove_index_not_a_concrete_index';
}
/** @internal */
export type AliasAction =
  | {
      remove_index: {
        index: string;
      };
    }
  | {
      remove: {
        index: string;
        alias: string;
        must_exist: boolean;
      };
    }
  | {
      add: {
        index: string;
        alias: string;
      };
    };
/** @internal */
export interface UpdateAliasesParams {
  client: ElasticsearchClient;
  aliasActions: AliasAction[];
  timeout?: string;
}
/**
 * Calls the Update index alias API `_alias` with the provided alias actions.
 */
export declare const updateAliases: ({
  client,
  aliasActions,
  timeout,
}: UpdateAliasesParams) => TaskEither.TaskEither<
  IndexNotFound | AliasNotFound | RemoveIndexNotAConcreteIndex | RetryableEsClientError,
  'update_aliases_succeeded'
>;
