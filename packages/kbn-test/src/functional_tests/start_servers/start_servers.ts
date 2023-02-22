/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import * as Rx from 'rxjs';
import dedent from 'dedent';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { readConfigFile } from '../../functional_test_runner';
import { runElasticsearch } from '../lib/run_elasticsearch';
import { runKibanaServer } from '../lib/run_kibana_server';
import { StartServerOptions } from './flags';

const FTR_SCRIPT_PATH = Path.resolve(REPO_ROOT, 'scripts/functional_test_runner');

export async function startServers(log: ToolingLog, options: StartServerOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/functional_tests_server');

  await withProcRunner(log, async (procs) => {
    const config = await readConfigFile(log, options.esVersion, options.config);

    const shutdownEs = await runElasticsearch({
      config,
      log,
      esFrom: options.esFrom,
      logsDir: options.logsDir,
    });

    await runKibanaServer({
      procs,
      config,
      installDir: options.installDir,
      extraKbnOpts: options.installDir ? [] : ['--dev', '--no-dev-config', '--no-dev-credentials'],
    });

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(log, 5000);

    const installDirFlag = options.installDir ? ` --kibana-install-dir=${options.installDir}` : '';
    const rel = Path.relative(process.cwd(), config.module.path);
    const pathsMessage = ` --${config.module.type}=${rel}`;

    log.success(
      '\n\n' +
        dedent`
          Elasticsearch and Kibana are ready for functional testing. Start the functional tests
          in another terminal session by running this command from this directory:

              node ${Path.relative(process.cwd(), FTR_SCRIPT_PATH)}${installDirFlag}${pathsMessage}
        ` +
        '\n\n'
    );

    await procs.waitForAllToStop();
    await shutdownEs();
  });
}

async function silence(log: ToolingLog, milliseconds: number) {
  await Rx.firstValueFrom(
    log.getWritten$().pipe(
      Rx.startWith(null),
      Rx.switchMap(() => Rx.timer(milliseconds))
    )
  );
}
