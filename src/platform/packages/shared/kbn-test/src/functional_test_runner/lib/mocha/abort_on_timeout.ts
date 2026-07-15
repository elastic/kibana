/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Lifecycle } from '../lifecycle';
import type { Runner } from '../../fake_mocha_types';

const TIMEOUT_RE = /Timeout of \d+ms exceeded/;

/**
 * On the first Mocha timeout (test or hook), abort the whole config run via
 * `lifecycle.abort()` instead of letting the run limp through remaining tests and the
 * full `afterTestSuite`/after-all teardown cascade (see `wrapRunnableArgs`).
 *
 * Listens on the Mocha `Runner`'s `fail` event rather than the FTR `testFailure` /
 * `testHookFailure` lifecycle events: a Mocha timeout completes the runnable directly
 * via its own timer (`Runnable#resetTimeout`) without ever rejecting the runnable's
 * promise, so those lifecycle events never fire for timeouts.
 *
 * Ordinary (non-timeout) failures are left alone so Smart Retry's failing-test set
 * stays meaningful.
 */
export function registerAbortOnTimeout(runner: Runner, lifecycle: Lifecycle, log: ToolingLog) {
  runner.on('fail', (_runnable: unknown, err: Error) => {
    if (lifecycle.isAborting || !TIMEOUT_RE.test(err?.message ?? '')) {
      return;
    }

    log.error(`FTR aborting config: Mocha timeout detected -> ${err.message}`);
    lifecycle.abort('mocha-timeout');
  });
}
