/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FunctionalTestRunner, readConfigFile } from '../../functional_test_runner';
import { CliError } from './run_cli';

async function createFtr({
  configPath,
  options: { installDir, log, bail, grep, updateBaselines, suiteFiles, suiteTags, updateSnapshots },
}) {
  const config = await readConfigFile(log, configPath);

  return {
    config,
    ftr: new FunctionalTestRunner(log, configPath, {
      mochaOpts: {
        bail: !!bail,
        grep,
      },
      kbnTestServer: {
        installDir,
      },
      updateBaselines,
      updateSnapshots,
      suiteFiles: {
        include: [...suiteFiles.include, ...config.get('suiteFiles.include')],
        exclude: [...suiteFiles.exclude, ...config.get('suiteFiles.exclude')],
      },
      suiteTags: {
        include: [...suiteTags.include, ...config.get('suiteTags.include')],
        exclude: [...suiteTags.exclude, ...config.get('suiteTags.exclude')],
      },
    }),
  };
}

export async function assertNoneExcluded({ configPath, options }) {
  const { config, ftr } = await createFtr({ configPath, options });

  if (config.get('testRunner')) {
    // tests with custom test runners are not included in this check
    return;
  }

  const stats = await ftr.getTestStats();
  if (stats.excludedTests.length > 0) {
    throw new CliError(`
      ${stats.excludedTests.length} tests in the ${configPath} config
      are excluded when filtering by the tags run on CI. Make sure that all suites are
      tagged with one of the following tags, or extend the list of tags in test/scripts/jenkins_xpack.sh

      tags: ${JSON.stringify(options.suiteTags)}

      - ${stats.excludedTests.join('\n      - ')}
    `);
  }
}

export async function runFtr({ configPath, options }) {
  const { ftr } = await createFtr({ configPath, options });

  const failureCount = await ftr.run();
  if (failureCount > 0) {
    throw new CliError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`
    );
  }
}

export async function hasTests({ configPath, options }) {
  const { ftr, config } = await createFtr({ configPath, options });

  if (config.get('testRunner')) {
    // configs with custom test runners are assumed to always have tests
    return true;
  }
  const stats = await ftr.getTestStats();
  return stats.testCount > 0;
}
