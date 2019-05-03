/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chalk from 'chalk';
import { isMaster } from 'cluster';
import { CliArgs, Env, RawConfigService } from './config';
import { LegacyObjectToConfigAdapter } from './legacy';
import { Root } from './root';

interface KibanaFeatures {
  // Indicates whether we can run Kibana in a so called cluster mode in which
  // Kibana is run as a "worker" process together with optimizer "worker" process
  // that are orchestrated by the "master" process (dev mode only feature).
  isClusterModeSupported: boolean;

  // Indicates whether we can run Kibana without X-Pack plugin pack even if it's
  // installed (dev mode only feature).
  isOssModeSupported: boolean;

  // Indicates whether we can run Kibana in REPL mode (dev mode only feature).
  isReplModeSupported: boolean;

  // Indicates whether X-Pack plugin pack is installed and available.
  isXPackInstalled: boolean;
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
  if (cliArgs.repl && !features.isReplModeSupported) {
    onRootShutdown('Kibana REPL mode can only be run in development mode.');
  }

  const env = Env.createDefault({
    configs,
    cliArgs,
    isDevClusterMaster: isMaster && cliArgs.dev && features.isClusterModeSupported,
  });

  const rawConfigService = new RawConfigService(
    env.configs,
    rawConfig => new LegacyObjectToConfigAdapter(applyConfigOverrides(rawConfig))
  );

  rawConfigService.loadConfig();

  const root = new Root(rawConfigService.getConfig$(), env, onRootShutdown);

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

  if (cliArgs.optimize) {
    const cliLogger = root.logger.get('cli');
    cliLogger.info('Optimization done.');
    await shutdown();
  }

  process.on('SIGHUP', () => {
    const cliLogger = root.logger.get('cli');
    cliLogger.info('Reloading logging configuration due to SIGHUP.', { tags: ['config'] });

    try {
      rawConfigService.reloadConfig();
    } catch (err) {
      return shutdown(err);
    }

    cliLogger.info('Reloaded logging configuration due to SIGHUP.', { tags: ['config'] });
  });

  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
}

function onRootShutdown(reason?: any) {
  if (reason !== undefined) {
    // There is a chance that logger wasn't configured properly and error that
    // that forced root to shut down could go unnoticed. To prevent this we always
    // mirror such fatal errors in standard output with `console.error`.
    // eslint-disable-next-line
    console.error(`\n${chalk.white.bgRed(' FATAL ')} ${reason}\n`);
  }

  process.exit(reason === undefined ? 0 : (reason as any).processExitCode || 1);
}
