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
import { Env, RawConfigService } from './config';
import { LegacyObjectToConfigAdapter } from './legacy_compat';
import { Root } from './root';

interface KibanaFeatures {
  // If we can access `cluster_manager.js` that means we can run Kibana in a so called cluster
  // mode when Kibana is run as a "worker" process together with optimizer "worker" process.
  isClusterModeSupported: boolean;

  // X-Pack is installed in both dev and the distributable, it's optional if
  // install is a link to the source, not an actual install.
  isOssModeSupported: boolean;

  // If we can access `repl/` that means we can run Kibana in REPL mode.
  isReplModeSupported: boolean;

  // X-Pack is considered as installed if it's available in `node_modules` folder and it
  // looks the same for both dev and the distributable.
  isXPackInstalled: boolean;
}

export async function bootstrap(
  cliArgs: Record<string, any>,
  applyConfigOverrides: (config: Record<string, any>) => Record<string, any>,
  features: KibanaFeatures
) {
  if (cliArgs.repl && !features.isReplModeSupported) {
    onRootShutdown('Kibana REPL mode can only be run in development mode.');
  }

  const env = Env.createDefault({
    configs: [].concat(cliArgs.config || []),
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
    await root.start();
  } catch (err) {
    await shutdown(err);
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
    // tslint:disable no-console
    console.error(`\n${chalk.white.bgRed(' FATAL ')} ${reason}\n`);
  }

  process.exit(reason === undefined ? 0 : (reason as any).processExitCode || 1);
}
