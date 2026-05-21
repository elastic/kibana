/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { Lifecycle } from '../lifecycle';
import type { Mocha, Runnable } from '../../fake_mocha_types';

export interface RunTestsResult {
  failureCount: number;
  failedFiles: string[];
}

/**
 *  Run the tests that have already been loaded into mocha. Aborts tests on
 *  'cleanup' lifecycle runs. Resolves with the count of mocha failures and
 *  the unique list of spec files that contained a failing test or hook.
 */
export async function runTests(
  lifecycle: Lifecycle,
  mocha: Mocha,
  abortSignal?: AbortSignal
): Promise<RunTestsResult> {
  const failedFiles = new Set<string>();

  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  const recordFailure = (runnable: Runnable) => {
    // Walk up to the runnable's parent suite if the runnable itself has no
    // file (true for hooks attached to nested describes that inherit from
    // their parent suite).
    let node: Runnable | undefined = runnable;
    while (node && !node.file) {
      node = node.parent;
    }
    if (node?.file) {
      failedFiles.add(node.file);
    }
  };

  runner.on('fail', recordFailure);

  Rx.race(
    lifecycle.cleanup.before$,
    abortSignal ? Rx.fromEvent(abortSignal, 'abort').pipe(Rx.take(1)) : Rx.NEVER
  ).subscribe({
    next() {
      if (!runComplete) {
        runComplete = true;
        runner.uncaught(new Error('Forcing mocha to abort'));
        runner.abort();
      }
    },
  });

  return new Promise<RunTestsResult>((resolve) => {
    const respond = () =>
      resolve({
        failureCount: runner.failures as unknown as number,
        failedFiles: [...failedFiles],
      });

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });
}
