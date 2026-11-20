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
import { once } from 'lodash';
import { silence } from '../common';
import { getPlaywrightGrepTag } from '../playwright/utils';
import { asError } from './as_error';
import { getConfigRootDir, loadServersConfig } from './configs';
import { logFleetPackageRegistryHint } from './configs/fleet_package_registry';
import type { StartServerOptions } from './flags';
import { preCreateSecurityIndexesViaSamlAuth } from './pre_create_security_indexes';
import { ensureDefaultSpaceNPRE } from './ensure_default_space_npre';
import type { StopDockerServers } from './run_docker_servers';
import { runDockerServers } from './run_docker_servers';
import { runElasticsearch } from './run_elasticsearch';
import { getExtraKbnOpts, runKibanaServer } from './run_kibana_server';
import { registerServerShutdown, shutdownServers } from './server_shutdown';

/** Exit code of a run interrupted by SIGINT, the one exit-hook uses as well. */
const SIGINT_EXIT_CODE = 130;

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

    const abortDockerStart = new AbortController();
    let dockerStartup: Promise<StopDockerServers> | undefined;
    let esStartup: Promise<() => Promise<void>> | undefined;
    let stopDockerServers: StopDockerServers | undefined;
    let shutdownEs: (() => Promise<void>) | undefined;

    // Runs once, from the signal hook, an early exit or the normal shutdown, whichever comes
    // first. A start still in progress is aborted (docker) or waited for (Elasticsearch) so that
    // nothing is left behind, then whatever came up is stopped.
    const shutdownBackingServices = once(async () => {
      abortDockerStart.abort();
      await dockerStartup?.catch(() => {});
      await esStartup?.catch(() => {});
      const errors: Error[] = [];
      const stop = async (fn?: () => Promise<void>) => {
        try {
          await fn?.();
        } catch (error) {
          errors.push(asError(error));
        }
      };
      await stop(shutdownEs);
      await stop(stopDockerServers);
      if (errors.length > 0) {
        throw errors[0];
      }
    });

    // Registered before anything starts: a SIGINT/SIGTERM during the registry readiness wait or
    // the Elasticsearch boot must not leave a detached container holding its port.
    const removeShutdownHook = registerServerShutdown(procs, shutdownBackingServices);

    // A backing service died on its own (e.g. the registry container got OOM-killed, the
    // Elasticsearch JVM went away). Kibana would keep serving against it, so take everything
    // down instead, and report that exit rather than whatever the teardown makes fail next.
    let earlyExitError: Error | undefined;
    const onEarlyExit = (msg: string) => {
      log.error(msg);
      log.info('scout: a backing service exited; shutting the servers down');
      earlyExitError = earlyExitError ?? new Error(msg);
      process.exitCode = 1;
      shutdownServers(procs, shutdownBackingServices).catch((error) => log.error(error));
    };

    let startupError: Error | undefined;

    try {
      logFleetPackageRegistryHint(log);
      // Docker-backed services (e.g. the Fleet package registry) and Elasticsearch do not depend
      // on each other, so they start together. Both must be up before Kibana boots, otherwise
      // Fleet setup falls back to retrying against a registry that is not there yet.
      dockerStartup = runDockerServers({
        config,
        log,
        onEarlyExit,
        signal: abortDockerStart.signal,
      }).then((stop) => {
        stopDockerServers = stop;
        return stop;
      });
      esStartup = runElasticsearch({
        config,
        log,
        esFrom: options.esFrom,
        preserveEsData: options.preserveEsData,
        logsDir: options.logsDir,
        onEarlyExit,
      }).then((shutdown) => {
        shutdownEs = once(shutdown);
        return shutdownEs;
      });
      await Promise.all([dockerStartup, esStartup]);

      await ensureDefaultSpaceNPRE(config, log);

      await runKibanaServer({
        procs,
        config,
        installDir: options.installDir,
        extraKbnOpts: getExtraKbnOpts(options.installDir, config.get('serverless')),
        onEarlyExit,
      });

      reportTime(runStartTime, 'ready', {
        success: true,
        ...options,
      });

      // wait for 5 seconds of silence before logging the
      // success message so that it doesn't get buried
      await silence(log, 5000);

      // Pre-create Elasticsearch Security indexes after server startup. Skipped for `prebootOnly`
      // config sets: Kibana is deliberately held in the `preboot` stage, so it serves no SAML
      // endpoints to authenticate against.
      if (!config.get('prebootOnly')) {
        await preCreateSecurityIndexesViaSamlAuth(config, log);
      }

      log.success(
        '\n\n' +
          dedent`
          Elasticsearch and Kibana are ready for functional testing.
          Use 'node scripts/playwright test --project local --grep ${pwGrepTag} --config <path_to_Playwright.config.ts>' to run tests'
        ` +
          '\n\n'
      );

      await procs.waitForAllToStop();
    } catch (error) {
      startupError = asError(error);
    }

    // Whatever failed, do not leave a detached container holding its port for the next run.
    let shutdownError: Error | undefined;
    log.info('scout: shutting down backing services');
    try {
      await shutdownBackingServices();
    } catch (error) {
      shutdownError = asError(error);
    }
    removeShutdownHook();

    if (earlyExitError !== undefined) {
      if (shutdownError !== undefined) {
        log.error(`shutdown after a failed start also failed: ${shutdownError.message}`);
      }
      throw earlyExitError;
    }
    // The start was interrupted by a signal: the shutdown hook aborted it. Not a failure to
    // report; exit with the signal's code, as exit-hook does once its hooks are done.
    if (startupError?.name === 'AbortError') {
      log.info('scout: server start interrupted');
      process.exitCode = SIGINT_EXIT_CODE;
      return;
    }
    if (startupError !== undefined) {
      if (shutdownError !== undefined) {
        log.error(`shutdown after a failed start also failed: ${shutdownError.message}`);
      }
      throw startupError;
    }
    if (shutdownError !== undefined) {
      throw shutdownError;
    }
  });
}
