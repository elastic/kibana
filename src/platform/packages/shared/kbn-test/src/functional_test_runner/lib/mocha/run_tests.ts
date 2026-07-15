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
import { registerAbortOnTimeout } from './abort_on_timeout';

/**
 *  Run the tests that have already been loaded into mocha. Aborts on 'cleanup'
 *  lifecycle runs and, when `abortOnTimeout` is enabled, on the first Mocha timeout.
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {Mocha} mocha
 *  @param  {ToolingLog} log
 *  @param  {{ abortOnTimeout?: boolean }} options
 *  @param  {AbortSignal} [abortSignal]
 *  @return {Promise<Number>} resolves to the number of test failures
 */
export async function runTests(
  lifecycle: Lifecycle,
  mocha: Mocha,
  log: ToolingLog,
  { abortOnTimeout = true }: { abortOnTimeout?: boolean } = {},
  abortSignal?: AbortSignal
) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  if (abortOnTimeout) {
    registerAbortOnTimeout(runner, lifecycle, log);
  }

  Rx.race(
    lifecycle.cleanup.before$,
    lifecycle.abort$.pipe(Rx.take(1)),
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

  return new Promise((resolve) => {
    const respond = () => resolve(runner.failures);

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });
}
