/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

export interface WaitForDelayParams {
  delayInSec: number;
}

export const waitForDelay = ({
  delayInSec,
}: WaitForDelayParams): TaskEither.TaskEither<never, 'wait_succeeded'> => {
  return () => {
    return delay(delayInSec)
      .then(() => Either.right('wait_succeeded' as const))
      .catch((err) => {
        // will never happen
        throw err;
      });
  };
};

const delay = (delayInSec: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayInSec * 1000));
