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
import { waitForTask } from './wait_for_task';

/** @internal */
export interface CleanupErrorResponse {
  type: 'cleanup_failed';
  failures: string[];
}

export const waitForDeleteByQueryTask = flow(
  waitForTask,
  TaskEither.chainW((res): TaskEither.TaskEither<CleanupErrorResponse, 'cleanup_successful'> => {
    if (Option.isSome(res.failures)) {
      return TaskEither.left({
        type: 'cleanup_failed' as const,
        failures: res.failures.value,
      });
    } else if (Option.isSome(res.error)) {
      throw new Error(
        'waitForDeleteByQueryTask task failed with the following error:\n' +
          JSON.stringify(res.error.value)
      );
    } else {
      return TaskEither.right('cleanup_successful' as const);
    }
  })
);
