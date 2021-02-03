/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { runTests } from '../../tasks';
import { runCli } from '../../lib';
import { processOptions, displayHelp } from './args';

/**
 * Run servers and tests for each config
 * Only cares about --config option. Other options
 * are passed directly to functional_test_runner, such as
 * --bail, --verbose, etc.
 * @param {string[]} defaultConfigPaths Optional paths to configs
 *                                      if no config option is passed
 */
export async function runTestsCli(defaultConfigPaths) {
  await runCli(displayHelp, async (userOptions) => {
    const options = processOptions(userOptions, defaultConfigPaths);
    await runTests(options);
  });
}
