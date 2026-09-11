/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

import type { EsVersion, Config } from '../../functional_test_runner';
import { FunctionalTestRunner } from '../../functional_test_runner';

/**
 * Exit code of `scripts/functional_tests` when the run completed and the only reason for the
 * nonzero exit is failing tests/hooks, all of which are in the JUnit report. Any other error
 * (config, server start/stop or crash mid-run, runner, reporter) exits with 1, so CI can tell
 * whether the JUnit failures fully explain the exit. Server errors thrown while shutting down
 * supersede this error because they are raised from a `finally` block in `runTests`.
 * Referenced by `.buildkite/scripts/steps/test/ftr_configs.sh`.
 */
export const FTR_TEST_FAILURES_EXIT_CODE = 11;

export async function runFtr(options: {
  log: ToolingLog;
  config: Config;
  esVersion: EsVersion;
  signal?: AbortSignal;
  retry?: number;
}) {
  const ftr = new FunctionalTestRunner(options.log, options.config, options.esVersion);

  const failureCount = await ftr.run(options.signal, options.retry);
  if (failureCount > 0) {
    // An aborted run (ES/Kibana exited early) stopped before every test ran, so its JUnit report
    // is incomplete and the failures do not explain the exit on their own.
    const exitCode = options.signal?.aborted ? 1 : FTR_TEST_FAILURES_EXIT_CODE;
    throw createFailError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`,
      { exitCode }
    );
  }
}

export async function checkForEnabledTestsInFtrConfig(options: {
  log: ToolingLog;
  config: Config;
  esVersion: EsVersion;
}) {
  if (options.config.get('testRunner')) {
    // configs with custom test runners are assumed to always have tests
    return true;
  }

  if (options.config.module.type === 'journey') {
    return !options.config.module.journey.config.isSkipped();
  }

  const ftr = new FunctionalTestRunner(options.log, options.config, options.esVersion);
  const stats = await ftr.getTestStats();
  if (!stats) {
    throw createFailError('unable to get test stats');
  }

  return stats.nonSkippedTestCount > 0;
}
