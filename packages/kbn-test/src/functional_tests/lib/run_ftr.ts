/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { FunctionalTestRunner, readConfigFile, EsVersion } from '../../functional_test_runner';
import { CliError } from './run_cli';

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
  const config = await readConfigFile(log, esVersion, configPath);

  return {
    config,
    ftr: new FunctionalTestRunner(
      log,
      configPath,
      {
        mochaOpts: {
          bail: !!bail,
          grep,
          dryRun: !!dryRun,
        },
        kbnTestServer: {
          installDir,
        },
        updateBaselines,
        updateSnapshots,
        suiteFiles: {
          include: [...(suiteFiles?.include || []), ...config.get('suiteFiles.include')],
          exclude: [...(suiteFiles?.exclude || []), ...config.get('suiteFiles.exclude')],
        },
        suiteTags: {
          include: [...(suiteTags?.include || []), ...config.get('suiteTags.include')],
          exclude: [...(suiteTags?.exclude || []), ...config.get('suiteTags.exclude')],
        },
      },
      esVersion
    ),
  };
}

export async function assertNoneExcluded(params: CreateFtrParams) {
  const { config, ftr } = await createFtr(params);

  if (config.get('testRunner')) {
    // tests with custom test runners are not included in this check
    return;
  }

  const stats = await ftr.getTestStats();
  if (!stats) {
    throw new Error('unable to get test stats');
  }
  if (stats.testsExcludedByTag.length > 0) {
    throw new CliError(`
      ${stats.testsExcludedByTag.length} tests in the ${params.configPath} config
      are excluded when filtering by the tags run on CI. Make sure that all suites are
      tagged with one of the following tags:

      ${JSON.stringify(params.options.suiteTags)}

      - ${stats.testsExcludedByTag.join('\n      - ')}
    `);
  }
}

export async function runFtr(params: CreateFtrParams, signal?: AbortSignal) {
  const { ftr } = await createFtr(params);

  const failureCount = await ftr.run(signal);
  if (failureCount > 0) {
    throw new CliError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`
    );
  }
}

export async function hasTests(params: CreateFtrParams) {
  const { ftr, config } = await createFtr(params);

  if (config.get('testRunner')) {
    // configs with custom test runners are assumed to always have tests
    return true;
  }
  const stats = await ftr.getTestStats();
  if (!stats) {
    throw new Error('unable to get test stats');
  }
  return stats.nonSkippedTestCount > 0;
}
