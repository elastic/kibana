/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { CliArgs, Env, RawConfigService } from './config';
import { CriticalError } from './errors';
import { getNodeInfo } from './node';
import { KibanaCoordinator } from './root/coordinator';
import { KibanaWorker } from './root/worker';
import { KibanaRoot } from './root/types';

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
  const { REPO_ROOT } = require('@kbn/utils');

  const env = Env.createDefault(REPO_ROOT, {
    // TODO: do we want to add nodeInfo to Env ?
    configs,
    cliArgs,
  });

  const rawConfigService = new RawConfigService(env.configs, applyConfigOverrides);
  rawConfigService.loadConfig();

  const nodeInfo = await getNodeInfo(rawConfigService);

  let root: KibanaRoot;
  if (nodeInfo.isCoordinator) {
    root = new KibanaCoordinator(rawConfigService, env, nodeInfo, onRootShutdown);
  } else {
    root = new KibanaWorker(rawConfigService, env, nodeInfo, onRootShutdown);
  }

  if (nodeInfo.isMaster) {
    process.on('SIGHUP', () => reloadConfiguration());

    // this is only used by the logrotator service
    // in order to be able to reload the log configuration
    // under the cluster mode
    process.on('message', (msg) => {
      if (!msg || msg.reloadConfiguration !== true) {
        return;
      }

      reloadConfiguration();
    });

    process.on('SIGINT', () => root.shutdown());
    process.on('SIGTERM', () => root.shutdown());
  }

  function reloadConfiguration() {
    const cliLogger = root.logger.get('cli');
    cliLogger.info('Reloading Kibana configuration due to SIGHUP.', { tags: ['config'] });

    try {
      rawConfigService.reloadConfig();
    } catch (err) {
      shutdown(err);
    }

    cliLogger.info('Reloaded Kibana configuration due to SIGHUP.', { tags: ['config'] });
  }

  function shutdown(reason?: Error) {
    rawConfigService.stop();
    return root.shutdown(reason);
  }

  try {
    await root.setup();
    await root.start();

    // notify parent process know when we are ready for dev mode.
    if (process.send) {
      process.send(['SERVER_LISTENING']);
    }
  } catch (err) {
    await shutdown(err);
  }
}

function onRootShutdown(reason?: any) {
  if (reason !== undefined) {
    // There is a chance that logger wasn't configured properly and error that
    // that forced root to shut down could go unnoticed. To prevent this we always
    // mirror such fatal errors in standard output with `console.error`.
    // eslint-disable-next-line
    console.error(`\n${chalk.white.bgRed(' FATAL ')} ${reason}\n`);
    process.exit(reason instanceof CriticalError ? reason.processExitCode : 1);
  }
  process.exit(0);
}
