/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { getPackages } from '@kbn/repo-packages';
import type { CliArgs } from '@kbn/config';
import { Env, RawConfigService } from '@kbn/config';
import { CriticalError } from '@kbn/core-base-server-internal';
import { Root } from './root';
import { MIGRATION_EXCEPTION_CODE } from './constants';

const SETUP_SIGNAL_TIMEOUT_MS = 90_000;
const SETUP_SIGNAL_TIMEOUT_SECONDS = SETUP_SIGNAL_TIMEOUT_MS / 1000;

interface BootstrapArgs {
  configs: string[];
  cliArgs: CliArgs;
  applyConfigOverrides: (config: Record<string, any>) => Record<string, any>;
}

/**
 *
 * @internal
 * @param param0 - options
 */
export async function bootstrap({ configs, cliArgs, applyConfigOverrides }: BootstrapArgs) {
  if (cliArgs.optimize) {
    // --optimize is deprecated and does nothing now, avoid starting up and just shutdown
    return;
  }

  // `bootstrap` is exported from the `src/core/server/index` module,
  // meaning that any test importing, implicitly or explicitly, anything concrete
  // from `core/server` will load `dev-utils`. As some tests are mocking the `fs` package,
  // and as `REPO_ROOT` is initialized on the fly when importing `dev-utils` and requires
  // the `fs` package, it causes failures. This is why we use a dynamic `require` here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { REPO_ROOT } = require('@kbn/repo-info');

  const shouldWaitForSetupSignal = Boolean(cliArgs.setupOnSignal);
  let setupSignalCompleted = !shouldWaitForSetupSignal;
  let resolveSetupSignal: (() => void) | undefined;
  let rejectSetupSignal: ((error: Error) => void) | undefined;
  let setupSignalTimer: NodeJS.Timeout | undefined;
  let logSetupInfo: (message: string) => void = () => {};
  let logSetupWarn: (message: string) => void = () => {};

  const waitForSetupSignalPromise = shouldWaitForSetupSignal
    ? new Promise<void>((resolve, reject) => {
        resolveSetupSignal = () => {
          if (setupSignalCompleted) {
            return;
          }
          setupSignalCompleted = true;
          if (setupSignalTimer) {
            clearTimeout(setupSignalTimer);
            setupSignalTimer = undefined;
          }
          resolve();
        };
        rejectSetupSignal = (error) => {
          if (setupSignalCompleted) {
            return;
          }
          setupSignalCompleted = true;
          if (setupSignalTimer) {
            clearTimeout(setupSignalTimer);
            setupSignalTimer = undefined;
          }
          reject(error);
        };
      })
    : Promise.resolve();

  const handleSetupSignal = () => {
    if (!shouldWaitForSetupSignal || setupSignalCompleted) {
      return;
    }

    logSetupInfo('SIGUSR1 received - continuing setup.');
    resolveSetupSignal?.();
    process.removeListener('SIGUSR1', handleSetupSignal);
  };

  if (shouldWaitForSetupSignal) {
    process.on('SIGUSR1', handleSetupSignal);
  }

  const env = Env.createDefault(REPO_ROOT, {
    configs,
    cliArgs,
    repoPackages: getPackages(REPO_ROOT),
  });

  const rawConfigService = new RawConfigService(env.configs, applyConfigOverrides);
  rawConfigService.loadConfig();

  const root = new Root(rawConfigService, env, onRootShutdown);
  const cliLogger = root.logger.get('cli');
  const rootLogger = root.logger.get('root');

  logSetupInfo = (message: string) => cliLogger.info(message, { tags: ['setup-on-signal'] });
  logSetupWarn = (message: string) => cliLogger.warn(message, { tags: ['setup-on-signal'] });

  let serverListeningSent = false;
  const notifyServerListening = () => {
    if (process.send && !serverListeningSent) {
      process.send(['SERVER_LISTENING']);
      serverListeningSent = true;
    }
  };

  rootLogger.info('Kibana is starting');

  cliLogger.debug('Kibana configurations evaluated in this order: ' + env.configs.join(', '));

  process.on('SIGHUP', () => reloadConfiguration());

  // This is only used by the LogRotator service
  // in order to be able to reload the log configuration
  // under the cluster mode
  process.on('message', (msg: any) => {
    if (!msg || msg.reloadConfiguration !== true) {
      return;
    }

    reloadConfiguration();
  });

  function reloadConfiguration(reason = 'SIGHUP signal received') {
    cliLogger.info(`Reloading Kibana configuration (reason: ${reason}).`, { tags: ['config'] });

    try {
      rawConfigService.reloadConfig();
    } catch (err) {
      return shutdown(err);
    }

    cliLogger.info(`Reloaded Kibana configuration (reason: ${reason}).`, { tags: ['config'] });
  }

  process.on('SIGINT', () => {
    rootLogger.info('SIGINT received - initiating shutdown');
    shutdown();
  });
  process.on('SIGTERM', () => {
    rootLogger.info('SIGTERM received - initiating shutdown');
    shutdown();
  });

  function shutdown(reason?: Error) {
    if (shouldWaitForSetupSignal) {
      process.removeListener('SIGUSR1', handleSetupSignal);
      if (setupSignalTimer) {
        clearTimeout(setupSignalTimer);
        setupSignalTimer = undefined;
      }
      if (!setupSignalCompleted) {
        resolveSetupSignal?.();
      }
    }

    rawConfigService.stop();
    return root.shutdown(reason);
  }

  try {
    const prebootContract = await root.preboot();
    let isSetupOnHold = false;

    if (prebootContract) {
      const { preboot } = prebootContract;
      // If setup is on hold then preboot server is supposed to serve user requests and we can let
      // dev parent process know that we are ready for dev mode.
      isSetupOnHold = preboot.isSetupOnHold();
      if (isSetupOnHold) {
        notifyServerListening();
      }

      if (isSetupOnHold) {
        rootLogger.info('Holding setup until preboot stage is completed.');
        const { shouldReloadConfig } = await preboot.waitUntilCanSetup();
        if (shouldReloadConfig) {
          await reloadConfiguration('configuration might have changed during preboot stage');
        }

        isSetupOnHold = preboot.isSetupOnHold();
      }
    }

    if (shouldWaitForSetupSignal) {
      if (!isSetupOnHold) {
        notifyServerListening();
      }
      isSetupOnHold = true;

      if (!setupSignalCompleted) {
        logSetupInfo('Waiting for SIGUSR1 to continue setup.');
        setupSignalTimer = setTimeout(() => {
          logSetupWarn(
            `SIGUSR1 was not received within ${SETUP_SIGNAL_TIMEOUT_SECONDS} seconds after preboot; initiating shutdown.`
          );
          rejectSetupSignal?.(
            new Error(
              `SIGUSR1 not received within ${SETUP_SIGNAL_TIMEOUT_SECONDS} seconds after preboot.`
            )
          );
        }, SETUP_SIGNAL_TIMEOUT_MS);

        try {
          await waitForSetupSignalPromise;
        } catch (signalError) {
          return shutdown(
            signalError instanceof Error ? signalError : new Error(String(signalError))
          );
        }
      } else {
        logSetupInfo('SIGUSR1 was already received before waiting for setup.');
      }

      isSetupOnHold = false;
    }

    await root.setup();
    await root.start();

    notifyServerListening();
  } catch (err) {
    await shutdown(err);
  }
}

function onRootShutdown(error?: any) {
  if (error !== undefined) {
    if (error.code !== MIGRATION_EXCEPTION_CODE) {
      // There is a chance that logger wasn't configured properly and error that
      // that forced root to shut down could go unnoticed. To prevent this we always
      // mirror such fatal errors in standard output with `console.error`.
      // eslint-disable-next-line no-console
      console.error(`\n${chalk.white.bgRed(' FATAL ')} ${error}\n`);
    }

    process.exit(error instanceof CriticalError ? error.processExitCode : 1);
  }

  process.exit(0);
}
