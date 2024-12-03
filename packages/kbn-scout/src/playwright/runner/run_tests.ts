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
import { withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import { runElasticsearch, runKibanaServer } from '../../servers';
import { loadServersConfig } from '../../config';
import { silence } from '../../common';
import { RunTestsOptions } from './flags';
import { getExtraKbnOpts } from '../../servers/run_kibana_server';
import { tagsByMode } from '../constants';

export async function runTests(log: ToolingLog, options: RunTestsOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout_test');

  const config = await loadServersConfig(options.mode, log);

  const playwrightTag = config.get('serverless')
    ? tagsByMode.serverless[config.get('projectType') as keyof typeof tagsByMode.serverless]
    : tagsByMode.stateful;
  const playwrightConfigPath = options.configPath;

  await withProcRunner(log, async (procs) => {
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

      // Running 'npx playwright test --config=${playwrightConfigPath}'
      await procs.run(`playwright`, {
        cmd: resolve(REPO_ROOT, './node_modules/.bin/playwright'),
        args: [
          'test',
          `--config=${playwrightConfigPath}`,
          `--grep=${playwrightTag}`,
          ...(options.headed ? ['--headed'] : []),
        ],
        cwd: resolve(REPO_ROOT),
        env: {
          ...process.env,
        },
        wait: true,
      });
    } finally {
      try {
        await procs.stop('kibana');
      } finally {
        if (shutdownEs) {
          await shutdownEs();
        }
      }
    }

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });
  });
}
