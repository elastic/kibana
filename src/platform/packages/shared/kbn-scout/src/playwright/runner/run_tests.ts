/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner, withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import { runElasticsearch, runKibanaServer } from '../../servers';
import { loadServersConfig } from '../../config';
import { silence } from '../../common';
import { RunTestsOptions } from './flags';
import { getExtraKbnOpts } from '../../servers/run_kibana_server';
import { getPlaywrightGrepTag, execPromise } from '../utils';
import { ScoutPlaywrightProjects } from '../types';

export const getPlaywrightProject = (
  testTarget: RunTestsOptions['testTarget'],
  mode: RunTestsOptions['mode']
): ScoutPlaywrightProjects => {
  if (testTarget === 'cloud') {
    return mode === 'stateful' ? 'ech' : 'mki';
  }

  return 'local';
};

async function runPlaywrightTest(procs: ProcRunner, cmd: string, args: string[]) {
  return procs.run(`playwright`, {
    cmd,
    args,
    cwd: resolve(REPO_ROOT),
    env: {
      ...process.env,
    },
    wait: true,
  });
}

export async function hasTestsInPlaywrightConfig(
  log: ToolingLog,
  cmd: string,
  cmdArgs: string[],
  configPath: string
): Promise<number> {
  log.info(`scout: Validate Playwright config has tests`);
  try {
    const validationCmd = ['SCOUT_REPORTER_ENABLED=false', cmd, ...cmdArgs, '--list'].join(' ');
    log.debug(`scout: running '${validationCmd}'`);

    const result = await execPromise(validationCmd);
    const lastLine = result.stdout.trim().split('\n').pop() || '';

    log.info(`scout: ${lastLine}`);
    return 0; // success
  } catch (err) {
    const errorMessage = (err as Error).message || String(err);

    if (errorMessage.includes('No tests found')) {
      log.error(`scout: No tests found in [${configPath}]`);
      return 2; // "no tests" code, no hard failure on CI
    }

    if (errorMessage.includes(`unknown command 'test'`)) {
      log.error(`scout: Playwright CLI is probably broken.\n${errorMessage}`);
      return 1;
    }

    log.error(`scout: Unknown error occurred.\n${errorMessage}`);
    return 1;
  }
}

async function runLocalServersAndTests(
  procs: ProcRunner,
  log: ToolingLog,
  options: RunTestsOptions,
  cmd: string,
  cmdArgs: string[]
) {
  const config = await loadServersConfig(options.mode, log);
  const abortCtrl = new AbortController();

  const onEarlyExit = (msg: string) => {
    log.error(msg);
    abortCtrl.abort();
  };

  let shutdownEs;

  try {
    shutdownEs = await runElasticsearch({
      onEarlyExit,
      config,
      log,
      esFrom: options.esFrom,
      logsDir: options.logsDir,
    });

    await runKibanaServer({
      procs,
      onEarlyExit,
      config,
      installDir: options.installDir,
      extraKbnOpts: getExtraKbnOpts(options.installDir, config.get('serverless')),
    });

    // wait for 5 seconds
    await silence(log, 5000);

    await runPlaywrightTest(procs, cmd, cmdArgs);
  } finally {
    try {
      await procs.stop('kibana');
    } finally {
      if (shutdownEs) {
        await shutdownEs();
      }
    }
  }
}

export async function runTests(log: ToolingLog, options: RunTestsOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout run-tests');

  const pwGrepTag = getPlaywrightGrepTag(options.mode);
  const pwConfigPath = options.configPath;
  const pwProject = getPlaywrightProject(options.testTarget, options.mode);

  const pwBinPath = resolve(REPO_ROOT, './node_modules/.bin/playwright');
  const pwCmdArgs = [
    'test',
    `--config=${pwConfigPath}`,
    `--grep=${pwGrepTag}`,
    `--project=${pwProject}`,
    ...(options.headed ? ['--headed'] : []),
  ];

  await withProcRunner(log, async (procs) => {
    const exitCode = await hasTestsInPlaywrightConfig(log, pwBinPath, pwCmdArgs, pwConfigPath);

    if (exitCode !== 0) {
      process.exit(exitCode);
    }

    if (pwProject === 'local') {
      await runLocalServersAndTests(procs, log, options, pwBinPath, pwCmdArgs);
    } else {
      await runPlaywrightTest(procs, pwBinPath, pwCmdArgs);
    }

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });
  });
}

export async function runPlaywrightTestCheck(log: ToolingLog) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout run-playwright-test-check');
  log.info(`scout: Validate 'playwright test' command can run successfully`);

  const pwBinPath = resolve(REPO_ROOT, './node_modules/.bin/playwright');
  const pwCmdArgs = [
    'test',
    `--config=x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts`,
    `--list`,
  ];

  await withProcRunner(log, async (procs) => {
    await runPlaywrightTest(procs, pwBinPath, pwCmdArgs);

    reportTime(runStartTime, 'ready', {
      success: true,
    });
  });
}
