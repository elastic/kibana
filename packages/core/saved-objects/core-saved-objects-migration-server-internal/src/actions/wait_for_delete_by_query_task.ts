/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { flow } from 'fp-ts/lib/function';
import { waitForTask } from './wait_for_task';

/** @internal */
export interface CleanupErrorResponse {
  type: 'cleanup_failed';
  failures: string[];
  versionConflicts?: number;
}

/** @internal */
export interface CleanupSuccessfulResponse {
  type: 'cleanup_successful';
  deleted?: number;
}

export const waitForDeleteByQueryTask = flow(
  waitForTask,
  TaskEither.chainW(
    (res): TaskEither.TaskEither<CleanupErrorResponse, CleanupSuccessfulResponse> => {
      if (Option.isSome(res.failures) || res.response?.version_conflicts) {
        return TaskEither.left({
          type: 'cleanup_failed' as const,
          failures: Option.isSome(res.failures) ? res.failures.value : [],
          versionConflicts: res.response?.version_conflicts,
        });
      } else if (Option.isSome(res.error)) {
        throw new Error(
          'waitForDeleteByQueryTask task failed with the following error:\n' +
            JSON.stringify(res.error.value)
        );
      } else {
        return TaskEither.right({
          type: 'cleanup_successful' as const,
          deleted: res.response?.deleted,
        });
      }
    }
  )
);
