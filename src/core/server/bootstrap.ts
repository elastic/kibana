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
import { getClusteringInfo } from './clustering';
import { KibanaCoordinator } from './root/coordinator';
import { KibanaWorker } from './root/worker';
import { KibanaRoot } from './root/types';

interface KibanaFeatures {
  // Indicates whether we can run Kibana in dev mode in which Kibana is run as
  // a child process together with optimizer "worker" processes that are
  // orchestrated by a parent process (dev mode only feature).
  isCliDevModeSupported: boolean;
}

interface BootstrapArgs {
  configs: string[];
  cliArgs: CliArgs;
  applyConfigOverrides: (config: Record<string, any>) => Record<string, any>;
  features: KibanaFeatures;
}

/**
 *
 * @internal
 * @param param0 - options
 */
export async function bootstrap({
  configs,
  cliArgs,
  applyConfigOverrides,
  features,
}: BootstrapArgs) {
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

  const rawConfigService = new RawConfigService(configs, applyConfigOverrides);
  rawConfigService.loadConfig();

  const clusterInfo = await getClusteringInfo(rawConfigService);
  const isDevCliParent =
    cliArgs.dev && features.isCliDevModeSupported && !process.env.isDevCliChild;

  const env = Env.createDefault(REPO_ROOT, {
    // TODO: do we want to add clusterInfo to Env ?
    configs,
    cliArgs,
    isDevCliParent,
  });

  let root: KibanaRoot;
  if (clusterInfo.isCoordinator && !isDevCliParent) {
    root = new KibanaCoordinator(rawConfigService, env, clusterInfo, onRootShutdown);
  } else {
    root = new KibanaWorker(rawConfigService, env, clusterInfo, onRootShutdown);
  }

  if (clusterInfo.isMaster) {
    process.on('SIGHUP', () => root.reloadLoggingConfig());

    // This is only used by the legacy LogRotator service
    // in order to be able to reload the log configuration
    // under the cluster mode
    process.on('message', (msg) => {
      if (msg?.reloadLoggingConfig === true) {
        root.reloadLoggingConfig();
      }
    });

    process.on('SIGINT', () => root.shutdown());
    process.on('SIGTERM', () => root.shutdown());
  }

  function shutdown(reason?: Error) {
    rawConfigService.stop();
    return root.shutdown(reason);
  }

  try {
    await root.setup();
    await root.start();
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
