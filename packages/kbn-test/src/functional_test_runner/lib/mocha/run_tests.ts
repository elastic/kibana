/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Lifecycle } from '../lifecycle';
import { Mocha } from '../../fake_mocha_types';

/**
 *  Run the tests that have already been loaded into
 *  mocha. aborts tests on 'cleanup' lifecycle runs
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Mocha} mocha
 *  @return {Promise<Number>} resolves to the number of test failures
 */
export async function runTests(lifecycle: Lifecycle, mocha: Mocha) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  lifecycle.cleanup.add(() => {
    if (!runComplete) runner.abort();
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
