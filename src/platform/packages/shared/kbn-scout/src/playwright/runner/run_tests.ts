/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner, withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import { runElasticsearch, runKibanaServer } from '../../servers';
import { loadServersConfig } from '../../config';
import { silence } from '../../common';
import { RunTestsOptions } from './flags';
import { getExtraKbnOpts } from '../../servers/run_kibana_server';
import { getPlaywrightGrepTag } from '../utils';
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

async function runPlaywrightTest(procs: ProcRunner, cmd: string, cmdArgs: string[]) {
  return procs.run(`playwright`, {
    cmd,
    args: cmdArgs,
    cwd: resolve(REPO_ROOT),
    env: {
      ...process.env,
    },
    wait: true,
  });
}

async function validatePlaywrightConfig(
  log: ToolingLog,
  cmd: string,
  cmdArgs: string[],
  configPath: string
) {
  log.info(`scout: Validate Playwright config has tests`);
  try {
    const result = await execPromise(
      `SCOUT_REPORTER_ENABLED=false ${cmd} ${cmdArgs.join(' ')} --list`
    );
    const lastLine = result.stdout.trim().split('\n').pop();
    log.info(`scout: ${lastLine}`);
  } catch (err) {
    log.error(`scout: No tests found in [${configPath}]`);
    process.exit(2); // code "2" means no tests found
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

  const playwrightGrepTag = getPlaywrightGrepTag(options.mode);
  const playwrightConfigPath = options.configPath;
  const playwrightProject = getPlaywrightProject(options.testTarget, options.mode);

  const testCmd = resolve(REPO_ROOT, './node_modules/.bin/playwright');
  const testCmdArgs = [
    'test',
    `--config=${playwrightConfigPath}`,
    `--grep=${playwrightGrepTag}`,
    `--project=${playwrightProject}`,
    ...(options.headed ? ['--headed'] : []),
  ];

  await withProcRunner(log, async (procs) => {
    await validatePlaywrightConfig(log, testCmd, testCmdArgs, playwrightConfigPath);

    if (playwrightProject === 'local') {
      await runLocalServersAndTests(procs, log, options, testCmd, testCmdArgs);
    } else {
      await runPlaywrightTest(procs, testCmd, testCmdArgs);
    }

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });
  });
}
