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

export async function runFtr(options: {
  log: ToolingLog;
  config: Config;
  esVersion: EsVersion;
  signal?: AbortSignal;
  runner?: FunctionalTestRunner;
}) {
  const ftr =
    options.runner ?? new FunctionalTestRunner(options.log, options.config, options.esVersion);

  const failureCount = await ftr.run(options.signal);
  if (failureCount > 0) {
    throw createFailError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`
    );
  }
}

export async function checkForEnabledTestsInFtrConfig(options: {
  log: ToolingLog;
  config: Config;
  esVersion: EsVersion;
}): Promise<{ hasTests: boolean; runner?: FunctionalTestRunner }> {
  if (options.config.get('testRunner')) {
    // configs with custom test runners are assumed to always have tests
    return { hasTests: true };
  }

  if (options.config.module.type === 'journey') {
    return { hasTests: !options.config.module.journey.config.isSkipped() };
  }

  const runner = new FunctionalTestRunner(options.log, options.config, options.esVersion);
  const stats = await runner.getTestStats();
  if (!stats) {
    throw createFailError('unable to get test stats');
  }

  const hasTests = stats.nonSkippedTestCount > 0;
  // Return the runner instance so it can be reused if there are no tests
  return { hasTests, runner: hasTests ? undefined : runner };
}
