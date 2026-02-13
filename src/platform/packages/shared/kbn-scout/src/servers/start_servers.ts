/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { withProcRunner } from '@kbn/dev-proc-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import dedent from 'dedent';
import { silence } from '../common';
import { getPlaywrightGrepTag } from '../playwright/utils';
import { getConfigRootDir, loadServersConfig } from './configs';
import type { StartServerOptions } from './flags';
import { preCreateSecurityIndexesViaSamlAuth } from './pre_create_security_indexes';
import { runElasticsearch } from './run_elasticsearch';
import { getExtraKbnOpts, runKibanaServer } from './run_kibana_server';

export async function startServers(log: ToolingLog, options: StartServerOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout_start_servers');

  await withProcRunner(log, async (procs) => {
    // Use a default path that resolves to default configs (contains 'scout/' not 'scout_')
    // If configDir is provided, it will override the default path detection
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const configRootDir = getConfigRootDir(
      defaultPlaywrightPath,
      options.testTarget,
      options.serverConfigSet
    );
    const config = await loadServersConfig(options.testTarget, log, configRootDir);
    const pwGrepTag = getPlaywrightGrepTag(options.testTarget);

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
      extraKbnOpts: getExtraKbnOpts(options.installDir, config.get('serverless')),
    });

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(log, 5000);

    // Pre-create Elasticsearch Security indexes after server startup
    await preCreateSecurityIndexesViaSamlAuth(config, log);

    log.success(
      '\n\n' +
        dedent`
          Elasticsearch and Kibana are ready for functional testing.
          Use 'npx playwright test --project local --grep ${pwGrepTag} --config <path_to_Playwright.config.ts>' to run tests'
        ` +
        '\n\n'
    );

    await procs.waitForAllToStop();
    await shutdownEs();
  });
}
