/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Lifecycle } from '../lifecycle';
import type { Mocha } from '../../fake_mocha_types';
import { FailFastAbortError, getFailFastLimitFromEnv, setupFailFast } from './fail_fast';

/**
 *  Run the tests that have already been loaded into mocha. Aborts tests on
 *  'cleanup' lifecycle runs. Resolves to the number of test failures, or rejects
 *  with a FailFastAbortError when the run is aborted due to consecutive failures.
 */
export async function runTests(
  lifecycle: Lifecycle,
  mocha: Mocha,
  log: ToolingLog,
  abortSignal?: AbortSignal
) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  // Abort the run early when too many tests fail back-to-back (opt-in via
  // FTR_FAIL_FAST_ENABLED). This lets CI bail out of runs broken by
  // environmental problems instead of grinding to the step timeout.
  const failFastLimit = getFailFastLimitFromEnv();
  let failFastTripped: FailFastAbortError | undefined;
  if (failFastLimit !== undefined) {
    setupFailFast(runner, log, {
      limit: failFastLimit,
      onTrip: (consecutiveFailures) => {
        failFastTripped = new FailFastAbortError(consecutiveFailures, failFastLimit);
        // a `fail` just fired so nothing is hung — a plain abort lets after-hooks
        // and reporters (e.g. junit) flush before the 'end' event is emitted
        if (!runComplete) {
          runner.abort();
        }
      },
    });
  }

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

  return new Promise((resolve, reject) => {
    const respond = () => {
      if (failFastTripped) {
        reject(failFastTripped);
      } else {
        resolve(runner.failures);
      }
    };

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });
}
