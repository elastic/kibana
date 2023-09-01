/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ToolingLog } from '@kbn/dev-utils';
import { createFailError } from '@kbn/dev-utils';

import { EsVersion, readConfigFile, FunctionalTestRunner } from '../../functional_test_runner';

export interface CreateFtrOptions {
  /** installation dir from which to run Kibana */
  installDir: string;
  log: ToolingLog;
  /** Whether to exit test run at the first failure */
  bail?: boolean;
  grep: string;
  updateBaselines?: boolean;
  suiteFiles?: {
    include?: string[];
    exclude?: string[];
  };
  suiteTags?: {
    include?: string[];
    exclude?: string[];
  };
  updateSnapshots?: boolean;
  esVersion: EsVersion;
  dryRun?: boolean;
}

export interface CreateFtrParams {
  configPath: string;
  options: CreateFtrOptions;
  signal?: AbortSignal;
}
async function createFtr({
  configPath,
  options: {
    installDir,
    log,
    bail,
    grep,
    updateBaselines,
    suiteFiles,
    suiteTags,
    updateSnapshots,
    esVersion,
    dryRun,
  },
}: CreateFtrParams) {
  const config = await readConfigFile(log, esVersion, configPath, {
    mochaOpts: {
      bail: !!bail,
      grep,
      dryRun: !!dryRun,
    },
    kbnTestServer: {
      installDir,
    },
    suiteFiles: {
      include: suiteFiles?.include || [],
      exclude: suiteFiles?.exclude || [],
    },
    suiteTags: {
      include: suiteTags?.include || [],
      exclude: suiteTags?.exclude || [],
    },
    updateBaselines,
    updateSnapshots,
  });

  return {
    config,
    ftr: new FunctionalTestRunner(log, config, esVersion),
  };
}

export async function assertNoneExcluded({ configPath, options }: CreateFtrParams) {
  const { config, ftr } = await createFtr({ configPath, options });

  if (config.get('testRunner')) {
    // tests with custom test runners are not included in this check
    return;
  }

  const stats = await ftr.getTestStats();
  if (stats?.testsExcludedByTag.length > 0) {
    throw createFailError(`
      ${stats?.testsExcludedByTag.length} tests in the ${configPath} config
      are excluded when filtering by the tags run on CI. Make sure that all suites are
      tagged with one of the following tags:

      ${JSON.stringify(options.suiteTags)}

      - ${stats?.testsExcludedByTag.join('\n      - ')}
    `);
  }
}

export async function runFtr({ configPath, options, signal }: CreateFtrParams) {
  const { ftr } = await createFtr({ configPath, options });

  const failureCount = await ftr.run(signal);
  if (failureCount > 0) {
    throw createFailError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`
    );
  }
}

export async function hasTests({ configPath, options }: CreateFtrParams) {
  const { ftr, config } = await createFtr({ configPath, options });

  if (config.get('testRunner')) {
    // configs with custom test runners are assumed to always have tests
    return true;
  }
  const stats = await ftr.getTestStats();
  return stats?.testCount && stats?.testCount > 0;
}
