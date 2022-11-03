/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { flow } from 'fp-ts/lib/function';
import { RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound, TargetIndexHadWriteBlock } from '.';
import { waitForTask, WaitForTaskCompletionTimeout } from './wait_for_task';
import { isWriteBlockException, isIncompatibleMappingException } from './es_errors';

export interface IncompatibleMappingException {
  type: 'incompatible_mapping_exception';
}

export const waitForReindexTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      | IndexNotFound
      | TargetIndexHadWriteBlock
      | IncompatibleMappingException
      | RetryableEsClientError
      | WaitForTaskCompletionTimeout,
      'reindex_succeeded'
    > => {
      if (Option.isSome(res.error)) {
        if (res.error.value.type === 'index_not_found_exception') {
          return TaskEither.left({
            type: 'index_not_found_exception' as const,
            index: res.error.value.index!,
          });
        } else {
          throw new Error('Reindex failed with the following error:\n' + JSON.stringify(res.error));
        }
      } else if (Option.isSome(res.failures)) {
        const failureCauses = res.failures.value.map((failure) => failure.cause);
        if (failureCauses.every(isWriteBlockException)) {
          return TaskEither.left({ type: 'target_index_had_write_block' as const });
        } else if (failureCauses.every(isIncompatibleMappingException)) {
          return TaskEither.left({ type: 'incompatible_mapping_exception' as const });
        } else {
          throw new Error(
            'Reindex failed with the following failures:\n' + JSON.stringify(res.failures.value)
          );
        }
      } else {
        return TaskEither.right('reindex_succeeded' as const);
      }
    }
  )
);
