/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { runElasticsearch } from './run_elasticsearch';
import { getExtraKbnOpts, runKibanaServer } from './run_kibana_server';
import { StartServerOptions } from './flags';
import { loadServersConfig } from '../config';
import { getEsClient, silence } from '../common';

export async function startServers(log: ToolingLog, options: StartServerOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout_start_servers');

  await withProcRunner(log, async (procs) => {
    const config = await loadServersConfig(options.mode, log);

    const shutdownEs = await runElasticsearch({
      config,
      log,
      esFrom: options.esFrom,
      logsDir: options.logsDir,
    });

    log.info('Enable authc debug logs for ES');
    const client = getEsClient(config.getScoutTestConfig(), log);
    await client.cluster.putSettings({
      persistent: {
        'logger.org.elasticsearch.xpack.security.authc': 'debug',
      },
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
