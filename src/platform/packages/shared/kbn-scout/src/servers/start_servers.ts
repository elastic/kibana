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
import { asError } from './as_error';
import type { BackingServices } from './backing_services';
import { resolveRunOutcome, startBackingServices } from './backing_services';
import { getConfigRootDir, loadServersConfig } from './configs';
import type { StartServerOptions } from './flags';
import { preCreateSecurityIndexesViaSamlAuth } from './pre_create_security_indexes';
import { ensureDefaultSpaceNPRE } from './ensure_default_space_npre';
import { getExtraKbnOpts, runKibanaServer } from './run_kibana_server';
import { registerServerShutdown, shutdownServers } from './server_shutdown';

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

    let backing: BackingServices | undefined;
    const shutdownBackingServices = () => backing?.shutdown() ?? Promise.resolve();

    // Registered before anything starts: a SIGINT/SIGTERM during the registry readiness wait or
    // the Elasticsearch boot must not leave a detached container holding its port.
    let interrupted = false;
    const removeShutdownHook = registerServerShutdown(procs, () => {
      interrupted = true;
      return shutdownBackingServices();
    });

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

    let runError: Error | undefined;

    try {
      // Both must be up before Kibana boots, otherwise Fleet setup falls back to retrying
      // against a registry that is not there yet.
      backing = startBackingServices({
        config,
        log,
        onEarlyExit,
        es: {
          esFrom: options.esFrom,
          preserveEsData: options.preserveEsData,
          logsDir: options.logsDir,
        },
      });
      await backing.ready;

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
      runError = asError(error);
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

    resolveRunOutcome({
      log,
      earlyExitError,
      interrupted,
      interruptedMessage: 'scout: server start interrupted',
      runError,
      shutdownError,
    });
  });
}
