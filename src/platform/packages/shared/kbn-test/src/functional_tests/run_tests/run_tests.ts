/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { setTimeout } from 'timers/promises';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';

import { TEST_ES_HOST, TEST_ES_PORT, TEST_REMOTE_KIBANA_PORT } from '@kbn/test-services';
import { applyFipsOverrides } from '../lib/fips_overrides';
import { Config, readConfigFile } from '../../functional_test_runner';

import { checkForEnabledTestsInFtrConfig, runFtr } from '../lib/run_ftr';
import { runElasticsearch } from '../lib/run_elasticsearch';
import { runKibanaServer } from '../lib/run_kibana_server';
import type { RunTestsOptions } from './flags';

/**
 * Run servers and tests for each config
 */
export async function runTests(log: ToolingLog, options: RunTestsOptions) {
  if (!process.env.CI) {
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning(
      "   Don't forget to use `node scripts/build_kibana_platform_plugins` to build plugins you plan on testing"
    );
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
  }

  const settingOverrides = {
    mochaOpts: {
      bail: options.bail,
      dryRun: options.dryRun,
      grep: options.grep,
    },
    esTestCluster: {
      from: options.esFrom,
    },
    kbnTestServer: {
      installDir: options.installDir,
    },
    suiteFiles: {
      include: options.suiteFilters.include,
      exclude: options.suiteFilters.exclude,
    },
    suiteTags: {
      include: options.suiteTags.include,
      exclude: options.suiteTags.exclude,
    },
    updateBaselines: options.updateBaselines,
    updateSnapshots: options.updateSnapshots,
  };

  for (const [i, path] of options.configs.entries()) {
    await log.indent(0, async () => {
      if (options.configs.length > 1) {
        const progress = `${i + 1}/${options.configs.length}`;
        log.write(`--- [${progress}] Running ${Path.relative(REPO_ROOT, path)}`);
      }

      let config: Config;
      if (process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() !== 'true') {
        config = await readConfigFile(log, options.esVersion, path, settingOverrides);
      } else {
        config = await readConfigFile(
          log,
          options.esVersion,
          path,
          settingOverrides,
          applyFipsOverrides
        );
      }

      const hasTests = await checkForEnabledTestsInFtrConfig({
        config,
        esVersion: options.esVersion,
        log,
      });
      if (!hasTests) {
        // just run the FTR, no Kibana or ES, which will quickly report a skipped test group to ci-stats and continue
        await runFtr({
          log,
          config,
          esVersion: options.esVersion,
        });
        return;
      }

      await withProcRunner(log, async (procs) => {
        const abortCtrl = new AbortController();

        const onEarlyExit = (msg: string) => {
          log.error(msg);
          abortCtrl.abort();
        };

        let shutdownEs;
        const kibanaProcessNames: string[] = [];

        try {
          if (process.env.TEST_ES_DISABLE_STARTUP !== 'true') {
            shutdownEs = await runElasticsearch({
              ...options,
              log,
              config,
              onEarlyExit,
            });
            if (abortCtrl.signal.aborted) {
              return;
            }
          }

          const mainKibanaProcesses = await runKibanaServer({
            procs,
            config,
            logsDir: options.logsDir,
            installDir: options.installDir,
            onEarlyExit,
            extraKbnOpts: [
              config.get('serverless')
                ? '--server.versioned.versionResolution=newest'
                : '--server.versioned.versionResolution=oldest',
            ],
          });

          kibanaProcessNames.push(...mainKibanaProcesses);

          const startRemoteKibana = config.get('kbnTestServer.startRemoteKibana');

          if (startRemoteKibana) {
            const remoteConfig = new Config({
              settings: {
                ...config.getAll(),
                kbnTestServer: {
                  sourceArgs: ['--no-base-path'],
                  serverArgs: [
                    ...config.get('kbnTestServer.serverArgs'),
                    `--xpack.fleet.syncIntegrations.taskInterval=5s`,
                    `--elasticsearch.hosts=http://${TEST_ES_HOST}:${TEST_ES_PORT}`,
                    `--server.port=${TEST_REMOTE_KIBANA_PORT}`,
                  ],
                },
              },
              path: config.path,
              module: config.module,
            });

            const remoteKibanaProcesses = await runKibanaServer({
              procs,
              config: remoteConfig,
              logsDir: options.logsDir,
              installDir: options.installDir,
              onEarlyExit,
              extraKbnOpts: [
                config.get('serverless')
                  ? '--server.versioned.versionResolution=newest'
                  : '--server.versioned.versionResolution=oldest',
              ],
              remote: true,
            });

            kibanaProcessNames.push(...remoteKibanaProcesses);
          }

          if (abortCtrl.signal.aborted) {
            return;
          }

          await runFtr({
            log,
            config,
            esVersion: options.esVersion,
            signal: abortCtrl.signal,
          });
        } finally {
          try {
            const delay = config.get('kbnTestServer.delayShutdown');
            if (typeof delay === 'number') {
              log.info('Delaying shutdown of Kibana for', delay, 'ms');
              await setTimeout(delay);
            }

            while (kibanaProcessNames.length > 0) {
              const name = kibanaProcessNames.pop();
              if (!name) {
                continue;
              }

              try {
                await procs.stop(name);
              } catch (error) {
                log.debug(`Failed to stop process ${name}`, error);
              }
            }
          } finally {
            if (shutdownEs) {
              await shutdownEs();
            }
          }
        }
      });
    });
  }
}
