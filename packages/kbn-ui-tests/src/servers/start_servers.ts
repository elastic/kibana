/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import dedent from 'dedent';

import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { runElasticsearch } from './run_elasticsearch';
import { runKibanaServer } from './run_kibana_server';
import { StartServerOptions } from './flags';
import { loadConfig, getConfigFilePath } from '../config/config_load';
import { saveTestServersConfigOnDisk } from '../config/helpers';
import { SupportedConfigurations } from '../config/types';

export async function startServers(log: ToolingLog, options: StartServerOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/functional_tests_server');
  const configOption = options.config as SupportedConfigurations;

  await withProcRunner(log, async (procs) => {
    // get path to one of the predefined config files
    const configPath = getConfigFilePath(options.config);
    // load config this is compatible with kbn-test input format
    const config = await loadConfig(configPath);
    // construct config for Playwright Test
    const testServersConfig = config.getTestServersConfig();
    // save test config to the file
    const savedPath = saveTestServersConfigOnDisk(testServersConfig);
    log.info(`ui_tests: test configuration was saved to ${savedPath}`);

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
      extraKbnOpts: options.installDir
        ? []
        : [
            '--dev',
            '--no-dev-config',
            '--no-dev-credentials',
            config.get('serverless')
              ? '--server.versioned.versionResolution=newest'
              : '--server.versioned.versionResolution=oldest',
          ],
    });

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(log, 5000);

    // const installDirFlag = options.installDir ? ` --kibana-install-dir=${options.installDir}` : '';
    // const rel = Path.relative(process.cwd(), config.module.path);
    // const pathsMessage = ` --${config.module.type}=${rel}`;

    log.success(
      '\n\n' +
        dedent`
          Elasticsearch and Kibana are ready for functional testing.
          Use 'npx playwright test --config <path_to_Playwright.config.ts>' to run tests'
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

// const writeGeneratedFile = (fileName: string, contents: string) => {
//   const genFileName = path.join(PLUGIN_DIR, fileName);
//   try {
//     fs.writeFileSync(genFileName, contents);
//   } catch (err) {
//     logError(`error writing file: ${genFileName}: ${err.message}`);
//   }
// };
