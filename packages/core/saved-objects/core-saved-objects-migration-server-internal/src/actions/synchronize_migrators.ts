/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { Defer } from '../kibana_migrator_utils';

export interface SyncFailed {
  type: 'sync_failed';
  error: Error;
}

export function synchronizeMigrators(
  defer: Defer<void>
): TaskEither.TaskEither<SyncFailed, 'synchronized_successfully'> {
  return () => {
    defer.resolve();
    return defer.promise
      .then(() => Either.right('synchronized_successfully' as const))
      .catch((error) => Either.left({ type: 'sync_failed' as const, error }));
  };
}
