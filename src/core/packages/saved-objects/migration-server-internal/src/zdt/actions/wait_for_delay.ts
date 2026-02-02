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

export interface WaitForDelayParams {
  delayInSec: number;
}

export const waitForDelay = ({
  delayInSec,
}: WaitForDelayParams): TaskEither.TaskEither<never, 'wait_succeeded'> => {
  return () => {
    // we need to use the standard setTimeout here, this way we can alter its behavior with jest.useFakeTimers()
    return new Promise((resolve) => setTimeout(resolve, delayInSec * 1000))
      .then(() => Either.right('wait_succeeded' as const))
      .catch((err) => {
        // will never happen
        throw err;
      });
  };
};
