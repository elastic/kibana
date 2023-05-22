/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { firstValueFrom } from 'rxjs';
import { getPackages } from '@kbn/repo-packages';
import { CliArgs, Env, RawConfigService } from '@kbn/config';
import { CriticalError } from '@kbn/core-base-server-internal';
import { resolve } from 'path';
import { getConfigDirectory } from '@kbn/utils';
import { statSync } from 'fs';
import { VALID_SERVERLESS_PROJECT_TYPES } from './root/serverless_config';
import { Root } from './root';
import { MIGRATION_EXCEPTION_CODE } from './constants';

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

  let env = Env.createDefault(REPO_ROOT, {
    configs,
    cliArgs,
    repoPackages: getPackages(REPO_ROOT),
  });

  let rawConfigService = new RawConfigService(env.configs, applyConfigOverrides);
  rawConfigService.loadConfig();

  // Hack to load the extra serverless config files if `serverless: {projectType}` is found in it.
  const rawConfig = await firstValueFrom(rawConfigService.getConfig$());
  const serverlessProjectType = rawConfig?.serverless;
  if (
    typeof serverlessProjectType === 'string' &&
    VALID_SERVERLESS_PROJECT_TYPES.includes(serverlessProjectType)
  ) {
    const extendedConfigs = [
      ...['serverless.yml', `serverless.${serverlessProjectType}.yml`]
        .map((name) => resolve(getConfigDirectory(), name))
        .filter(configFileExists),
      ...configs,
    ];

    env = Env.createDefault(REPO_ROOT, {
      configs: extendedConfigs,
      cliArgs: { ...cliArgs, serverless: true },
      repoPackages: getPackages(REPO_ROOT),
    });

    rawConfigService.stop();
    rawConfigService = new RawConfigService(env.configs, applyConfigOverrides);
    rawConfigService.loadConfig();
  }

  const root = new Root(rawConfigService, env, onRootShutdown);

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
    const cliLogger = root.logger.get('cli');
    cliLogger.info(`Reloading Kibana configuration (reason: ${reason}).`, { tags: ['config'] });

    try {
      rawConfigService.reloadConfig();
    } catch (err) {
      return shutdown(err);
    }

    cliLogger.info(`Reloaded Kibana configuration (reason: ${reason}).`, { tags: ['config'] });
  }

  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  function shutdown(reason?: Error) {
    rawConfigService.stop();
    return root.shutdown(reason);
  }

  try {
    const { preboot } = await root.preboot();

    // If setup is on hold then preboot server is supposed to serve user requests and we can let
    // dev parent process know that we are ready for dev mode.
    const isSetupOnHold = preboot.isSetupOnHold();
    if (process.send && isSetupOnHold) {
      process.send(['SERVER_LISTENING']);
    }

    if (isSetupOnHold) {
      root.logger.get().info('Holding setup until preboot stage is completed.');
      const { shouldReloadConfig } = await preboot.waitUntilCanSetup();
      if (shouldReloadConfig) {
        await reloadConfiguration('configuration might have changed during preboot stage');
      }
    }

    await root.setup();
    await root.start();

    // Notify parent process if we haven't done that yet during preboot stage.
    if (process.send && !isSetupOnHold) {
      process.send(['SERVER_LISTENING']);
    }
  } catch (err) {
    await shutdown(err);
  }
}

function onRootShutdown(reason?: any) {
  if (reason !== undefined) {
    if (reason.code !== MIGRATION_EXCEPTION_CODE) {
      // There is a chance that logger wasn't configured properly and error that
      // that forced root to shut down could go unnoticed. To prevent this we always
      // mirror such fatal errors in standard output with `console.error`.
      // eslint-disable-next-line no-console
      console.error(`\n${chalk.white.bgRed(' FATAL ')} ${reason}\n`);
    }

    process.exit(reason instanceof CriticalError ? reason.processExitCode : 1);
  }

  process.exit(0);
}

function configFileExists(path: string) {
  try {
    return statSync(path).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }

    throw err;
  }
}
