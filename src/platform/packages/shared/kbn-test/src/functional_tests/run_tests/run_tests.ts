/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { setTimeout as setTimeoutAsync } from 'timers/promises';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';

import apm from 'elastic-apm-node';
import { withSpan } from '@kbn/apm-utils';
import { applyFipsOverrides } from '../lib/fips_overrides';
import { Config, readConfigFile } from '../../functional_test_runner';

import { checkForEnabledTestsInFtrConfig, runFtr } from '../lib/run_ftr';
import { runElasticsearch } from '../lib/run_elasticsearch';
import { runKibanaServer } from '../lib/run_kibana_server';
import { runDockerServers } from '../lib/run_docker_servers';
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
      const tx = apm.startTransaction(`RUN ${Path.relative(REPO_ROOT, path)}`, 'config');

      if (options.configs.length > 1) {
        const progress = `${i + 1}/${options.configs.length}`;

        log.write(`--- [${progress}] Running ${Path.relative(REPO_ROOT, path)}`);
      }

      const config = await readConfigFile(
        log,
        options.esVersion,
        path,
        settingOverrides,
        process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() !== 'true' ? undefined : applyFipsOverrides
      );

      // Check if there are any enabled tests before starting servers
      // If not, reuse the runner instance to report skipped test group to ci-stats
      const { hasTests, runner } = await checkForEnabledTestsInFtrConfig({
        config,
        esVersion: options.esVersion,
        log,
      });

      if (!hasTests) {
        await runFtr({
          log,
          config,
          esVersion: options.esVersion,
          runner,
        }).finally(() => {
          tx.end();
        });
        return;
      }

      await withProcRunner(log, async (procs) => {
        const abortCtrl = new AbortController();

        const onEarlyExit = (msg: string) => {
          log.error(msg);
          abortCtrl.abort();
        };

        let shutdownEs: (() => Promise<void>) | undefined;
        let shutdownDockerServers: (() => Promise<void>) | undefined;

        try {
          // Check if any docker servers are enabled to avoid unnecessary startup time
          const dockerServerConfigs = config.get('dockerServers') as
            | Record<string, any>
            | undefined;

          const hasEnabledDockerServers =
            dockerServerConfigs &&
            Object.keys(dockerServerConfigs).length > 0 &&
            Object.values(dockerServerConfigs).some((cfg) => cfg.enabled === true);

          if (hasEnabledDockerServers) {
            log.info('🚀 Starting Elasticsearch, Docker servers, and Kibana in parallel...');
          } else {
            log.info('🚀 Starting Elasticsearch and Kibana in parallel...');
          }

          // Start ES, Kibana and Docker servers in parallel
          // Use Promise.allSettled to ensure all complete (or fail) before proceeding
          // All promises start executing immediately when created
          const results = await Promise.allSettled([
            // Start Elasticsearch - this completes when ES cluster health is yellow/green
            withSpan('start_elasticsearch', async () => {
              if (process.env.TEST_ES_DISABLE_STARTUP === 'true') {
                return undefined;
              }
              const shutdown = await runElasticsearch({ ...options, log, config, onEarlyExit });
              log.info('✅ Elasticsearch is ready');
              return shutdown;
            }),

            // Start Kibana - will retry ES connections until successful
            withSpan('start_kibana', async () => {
              await runKibanaServer({
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
              log.info('✅ Kibana is ready');
            }),

            // Only start docker servers if at least one is enabled
            ...(hasEnabledDockerServers
              ? [
                  withSpan('start_docker_servers', async () => {
                    const shutdown = await runDockerServers({ log, config, onEarlyExit });
                    log.info('✅ Docker servers are ready');
                    return shutdown;
                  }),
                ]
              : []),
          ]);

          // Check if any service failed to start
          const [esResult, kibanaResult, dockerResult] = results;

          if (esResult.status === 'rejected') {
            throw esResult.reason;
          }

          if (kibanaResult.status === 'rejected') {
            throw kibanaResult.reason;
          }

          if (dockerResult?.status === 'rejected') {
            throw dockerResult.reason;
          }

          shutdownEs =
            esResult.status === 'fulfilled'
              ? (esResult.value as (() => Promise<void>) | undefined)
              : undefined;

          shutdownDockerServers =
            dockerResult && dockerResult.status === 'fulfilled'
              ? (dockerResult.value as () => Promise<void>)
              : undefined;

          if (abortCtrl.signal.aborted) {
            return;
          }

          const startRemoteKibana = config.get('kbnTestServer.startRemoteKibana');

          if (startRemoteKibana) {
            await withSpan('start_remote_kibana', () =>
              runKibanaServer({
                procs,
                config: new Config({
                  settings: {
                    ...config.getAll(),
                    kbnTestServer: {
                      sourceArgs: ['--no-base-path'],
                      serverArgs: [
                        ...config.get('kbnTestServer.serverArgs'),
                        `--xpack.fleet.syncIntegrations.taskInterval=5s`,
                        `--elasticsearch.hosts=http://localhost:9221`,
                        `--server.port=5621`,
                      ],
                    },
                  },
                  path: config.path,
                  module: config.module,
                }),
                logsDir: options.logsDir,
                installDir: options.installDir,
                onEarlyExit,
                extraKbnOpts: [
                  config.get('serverless')
                    ? '--server.versioned.versionResolution=newest'
                    : '--server.versioned.versionResolution=oldest',
                ],
                remote: true,
              })
            );
          }

          if (abortCtrl.signal.aborted) {
            tx.setOutcome('failure');
            return;
          }

          await withSpan('run_tests', () =>
            runFtr({
              log,
              config,
              esVersion: options.esVersion,
              signal: abortCtrl.signal,
            })
          );

          tx.setOutcome('success');
        } catch (err) {
          tx.setOutcome('failure');
          throw err;
        } finally {
          try {
            const delay = config.get('kbnTestServer.delayShutdown');
            if (typeof delay === 'number') {
              log.info('Delaying shutdown of Kibana for', delay, 'ms');
              await setTimeoutAsync(delay);
            }

            await withSpan('shutdown_kibana', () => procs.stop('kibana'));
          } finally {
            // Clean up docker servers before ES
            if (shutdownDockerServers) {
              await shutdownDockerServers();
            }
            if (shutdownEs) {
              await withSpan('shutdown_es', () => shutdownEs!());
            }
          }
        }
      }).finally(() => {
        tx.end();
      });
    });
  }
}
