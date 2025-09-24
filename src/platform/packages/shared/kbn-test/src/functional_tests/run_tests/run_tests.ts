/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Os from 'os';
import { setTimeout } from 'timers/promises';
import getPort from 'get-port';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';

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

  // scheduler controls
  const queue = (options as any).queue ?? 1; // max warmed-but-not-running
  const parallel = (options as any).parallel ?? 1; // max running

  interface WarmHandle {
    index: number;
    warmed: Promise<void>;
    startRun: () => void;
    done: Promise<void>;
    isWarmed: boolean;
    hasStarted: boolean;
    finished: boolean;
  }

  const handles: Array<WarmHandle | undefined> = new Array(options.configs.length);
  let activeWarming = 0;
  let running = 0;
  let nextIndexToWarm = 0;
  let nextIndexToRun = 0;
  let completed = 0;

  function createDeferred<T = void>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (e: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  const allDone = createDeferred<void>();

  const tryStartRuns = () => {
    // Skip over any configs that are already finished (either warm failed or run completed)
    while (
      nextIndexToRun < options.configs.length &&
      handles[nextIndexToRun] &&
      handles[nextIndexToRun]!.finished
    ) {
      nextIndexToRun++;
    }
    while (
      running < parallel &&
      nextIndexToRun < options.configs.length &&
      handles[nextIndexToRun] &&
      handles[nextIndexToRun]!.isWarmed &&
      !handles[nextIndexToRun]!.hasStarted
    ) {
      const h = handles[nextIndexToRun]!;
      h.hasStarted = true;
      running++;
      log.info(
        `▶️  Starting tests for ${Path.relative(
          REPO_ROOT,
          options.configs[h.index]
        )} (slot ${running}/${parallel})`
      );
      h.startRun();
      nextIndexToRun++;
    }
  };

  const fillWarmers = () => {
    while (nextIndexToWarm < options.configs.length && activeWarming + running < queue + parallel) {
      const i = nextIndexToWarm++;
      activeWarming++;
      log.info(
        `🔥 Warming config ${i + 1}/${options.configs.length}: ${Path.relative(
          REPO_ROOT,
          options.configs[i]
        )} (activeWarming=${activeWarming}, running=${running})`
      );
      const handle = warmConfig(i);
      handles[i] = handle;
      handle.warmed
        .then(() => {
          activeWarming--;
          log.info(
            `✅ Warmed ${i + 1}/${options.configs.length}: ${Path.relative(
              REPO_ROOT,
              options.configs[i]
            )} (activeWarming=${activeWarming}, running=${running})`
          );
          tryStartRuns();
          fillWarmers();
        })
        .catch((e) => {
          activeWarming--;
          log.error(`Warm failed for ${Path.relative(REPO_ROOT, options.configs[i])}: ${e}`);
          if (handles[i]) {
            handles[i]!.finished = true;
          }
          // Advance run pointer in case we were waiting on this index
          tryStartRuns();
          tryStartRuns();
          fillWarmers();
        });
      handle.done
        .then(() => {
          running = Math.max(0, running - 1);
          completed++;
          if (handles[i]) {
            handles[i]!.finished = true;
          }
          log.info(
            `✔️ Completed ${i + 1}/${options.configs.length}: ${Path.relative(
              REPO_ROOT,
              options.configs[i]
            )} (completed=${completed})`
          );
          if (completed === options.configs.length) {
            allDone.resolve();
          } else {
            tryStartRuns();
            fillWarmers();
          }
        })
        .catch((e) => {
          running = Math.max(0, running - 1);
          completed++;
          if (handles[i]) {
            handles[i]!.finished = true;
          }
          log.error(`Run failed for ${Path.relative(REPO_ROOT, options.configs[i])}: ${e}`);
          if (completed === options.configs.length) {
            allDone.resolve();
          } else {
            tryStartRuns();
            fillWarmers();
          }
        });
    }
  };

  const warmConfig = (index: number): WarmHandle => {
    const path = options.configs[index];
    const warmedDeferred = createDeferred<void>();
    const runGate = createDeferred<void>();
    const out: WarmHandle = {
      index,
      warmed: warmedDeferred.promise,
      startRun: () => runGate.resolve(),
      // initialize with a resolved done which will be replaced once set below
      done: Promise.resolve(),
      isWarmed: false,
      hasStarted: false,
      finished: false,
    };

    const done = (async () => {
      await log.indent(0, async () => {
        if (options.configs.length > 1) {
          const progress = `${index + 1}/${options.configs.length}`;
          log.write(`--- [${progress}] Preparing ${Path.relative(REPO_ROOT, path)}`);
        }

        let baseConfig: Config;
        if (process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() !== 'true') {
          baseConfig = await readConfigFile(log, options.esVersion, path, settingOverrides);
        } else {
          baseConfig = await readConfigFile(
            log,
            options.esVersion,
            path,
            settingOverrides,
            applyFipsOverrides
          );
        }

        const hasTests = await checkForEnabledTestsInFtrConfig({
          config: baseConfig,
          esVersion: options.esVersion,
          log,
        });

        if (!hasTests) {
          // no warm phase needed, but still respect run parallelism
          out.isWarmed = true;
          warmedDeferred.resolve();
          await runGate.promise;
          // No dynamic port allocation here since we won't warm/start servers,
          // but still execute tests if present
          await runFtr({ log, config: baseConfig, esVersion: options.esVersion });
          return;
        }

        // allocate unique ports and data dirs
        const esPort = await getPort();
        const kbnPort = await getPort();
        const remoteKbnPort = await getPort();

        const kbnProtocol: 'http' | 'https' = baseConfig.get('servers.kibana.protocol');
        const kbnHost: string = baseConfig.get('servers.kibana.hostname');
        const publicBaseUrl = `${kbnProtocol}://${kbnHost}:${kbnPort}`;
        const esProtocol: 'http' | 'https' = baseConfig.get('esTestCluster.ssl') ? 'https' : 'http';

        // derive unique logs dir per config to avoid conflicts when running concurrently
        const logsDir = options.logsDir;

        // augment config with unique ports and server args
        // Also: rewrite ES SAML SP endpoints to match the dynamic Kibana URL, but only if the SAML realm is configured
        const realmName = 'cloud-saml-kibana';
        const baseEsArgs: string[] = baseConfig.get('esTestCluster.serverArgs');
        const hasSamlRealm = baseEsArgs.some((arg) =>
          arg.includes(`xpack.security.authc.realms.saml.${realmName}.`)
        );
        const withoutSamlSp = hasSamlRealm
          ? baseEsArgs.filter(
              (arg) =>
                !arg.includes(`xpack.security.authc.realms.saml.${realmName}.sp.entity_id=`) &&
                !arg.includes(`xpack.security.authc.realms.saml.${realmName}.sp.acs=`) &&
                !arg.includes(`xpack.security.authc.realms.saml.${realmName}.sp.logout=`)
            )
          : baseEsArgs;
        const kibanaUrlForSaml = `${kbnProtocol}://${kbnHost}:${kbnPort}`;
        const samlSpOverrides = hasSamlRealm
          ? [
              `xpack.security.authc.realms.saml.${realmName}.sp.entity_id=${kibanaUrlForSaml}`,
              `xpack.security.authc.realms.saml.${realmName}.sp.acs=${kibanaUrlForSaml}/api/security/saml/callback`,
              `xpack.security.authc.realms.saml.${realmName}.sp.logout=${kibanaUrlForSaml}/logout`,
            ]
          : [];
        const augmentedConfig = new Config({
          settings: {
            ...baseConfig.getAll(),
            servers: {
              ...baseConfig.get('servers'),
              elasticsearch: {
                ...baseConfig.get('servers.elasticsearch'),
                port: esPort,
              },
              kibana: {
                ...baseConfig.get('servers.kibana'),
                port: kbnPort,
              },
            },
            esTestCluster: {
              ...baseConfig.get('esTestCluster'),
              serverArgs: [...withoutSamlSp, ...samlSpOverrides],
            },
            kbnTestServer: {
              ...baseConfig.get('kbnTestServer'),
              serverArgs: [
                ...baseConfig.get('kbnTestServer.serverArgs'),
                `--server.port=${kbnPort}`,
                `--server.publicBaseUrl=${publicBaseUrl}`,
                ...(process.env.TEST_ES_DISABLE_STARTUP === 'true'
                  ? []
                  : [`--elasticsearch.hosts=${esProtocol}://localhost:${esPort}`]),
                `--path.data=${Path.resolve(
                  Os.tmpdir(),
                  `ftr-${process.pid}-${index}-${Date.now()}`
                )}`,
              ],
            },
          },
          path: baseConfig.path,
          module: baseConfig.module,
        });

        try {
          await withProcRunner(log, async (procs) => {
            const abortCtrl = new AbortController();

            const onEarlyExit = (msg: string) => {
              log.error(msg);
              abortCtrl.abort();
            };

            let shutdownEs: undefined | (() => Promise<void>);
            try {
              if (process.env.TEST_ES_DISABLE_STARTUP !== 'true') {
                shutdownEs = await runElasticsearch({
                  ...options,
                  log,
                  config: augmentedConfig,
                  onEarlyExit,
                  logsDir,
                  name: `ftr-${index}`,
                });
                if (abortCtrl.signal.aborted) {
                  return;
                }
              }

              await runKibanaServer({
                procs,
                config: augmentedConfig,
                logsDir,
                installDir: options.installDir,
                onEarlyExit,
                extraKbnOpts: [
                  augmentedConfig.get('serverless')
                    ? '--server.versioned.versionResolution=newest'
                    : '--server.versioned.versionResolution=oldest',
                ],
              });

              const startRemoteKibana = augmentedConfig.get('kbnTestServer.startRemoteKibana');

              if (startRemoteKibana) {
                const remotePublicBaseUrl = `${kbnProtocol}://${kbnHost}:${remoteKbnPort}`;
                const remoteArgs = [
                  ...augmentedConfig.get('kbnTestServer.serverArgs'),
                  `--xpack.fleet.syncIntegrations.taskInterval=5s`,
                  `--server.port=${remoteKbnPort}`,
                  `--server.publicBaseUrl=${remotePublicBaseUrl}`,
                  `--path.data=${Path.resolve(
                    Os.tmpdir(),
                    `ftr-remote-${process.pid}-${index}-${Date.now()}`
                  )}`,
                ];
                const esHostsArg = `--elasticsearch.hosts=${esProtocol}://localhost:${esPort}`;

                await runKibanaServer({
                  procs,
                  config: new Config({
                    settings: {
                      ...augmentedConfig.getAll(),
                      kbnTestServer: {
                        sourceArgs: ['--no-base-path'],
                        serverArgs:
                          process.env.TEST_ES_DISABLE_STARTUP === 'true'
                            ? remoteArgs
                            : [...remoteArgs, esHostsArg],
                      },
                    },
                    path: augmentedConfig.path,
                    module: augmentedConfig.module,
                  }),
                  logsDir,
                  installDir: options.installDir,
                  onEarlyExit,
                  extraKbnOpts: [
                    augmentedConfig.get('serverless')
                      ? '--server.versioned.versionResolution=newest'
                      : '--server.versioned.versionResolution=oldest',
                  ],
                  remote: true,
                });
              }

              if (abortCtrl.signal.aborted) {
                return;
              }

              // Signal that warm phase completed; wait to be scheduled to run
              out.isWarmed = true;
              warmedDeferred.resolve();
              await runGate.promise;

              // Ensure tests which rely on kbnTestConfig read the correct Kibana URL/port
              const prevUrl = process.env.TEST_KIBANA_URL;
              const prevPort = process.env.TEST_KIBANA_PORT;
              try {
                process.env.TEST_KIBANA_PORT = String(kbnPort);
                process.env.TEST_KIBANA_URL = `${kbnProtocol}://${kbnHost}:${kbnPort}`;

                await runFtr({
                  log,
                  config: augmentedConfig,
                  esVersion: options.esVersion,
                  signal: abortCtrl.signal,
                });
              } finally {
                if (prevUrl === undefined) {
                  delete process.env.TEST_KIBANA_URL;
                } else {
                  process.env.TEST_KIBANA_URL = prevUrl;
                }
                if (prevPort === undefined) {
                  delete process.env.TEST_KIBANA_PORT;
                } else {
                  process.env.TEST_KIBANA_PORT = prevPort;
                }
              }
            } finally {
              try {
                const delay = augmentedConfig.get('kbnTestServer.delayShutdown');
                if (typeof delay === 'number') {
                  log.info('Delaying shutdown of Kibana for', delay, 'ms');
                  await setTimeout(delay);
                }

                // Stop main and any auxiliary Kibana processes if present
                for (const name of [
                  'kibana',
                  'kbn-ui',
                  'kbn-tasks',
                  'kibana-remote',
                  'kbn-ui-remote',
                  'kbn-tasks-remote',
                ]) {
                  try {
                    await procs.stop(name);
                  } catch (e) {
                    // ignore unknown process names
                  }
                }
              } finally {
                if (shutdownEs) {
                  await shutdownEs();
                }
              }
            }
          });
          log.info(`Completed config ${augmentedConfig.path}`);
        } catch (err) {
          // If warm phase didn't complete, reject so scheduler can free the slot
          if (!out.isWarmed) {
            warmedDeferred.reject(err);
          }
          throw err;
        }
      });
    })();

    out.done = done;
    return out;
  };

  // kick off initial warmers and orchestrate
  fillWarmers();
  await allDone.promise;
}
