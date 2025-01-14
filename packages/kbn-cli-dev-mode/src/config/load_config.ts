/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Env, RawConfigService, ConfigService, type RawConfigAdapter } from '@kbn/config';
import { type Logger } from '@kbn/logging';
import { devConfigSchema, DevConfig, type DevConfigType } from './dev_config';
import { httpConfigSchema, HttpConfig, type HttpConfigType } from './http_config';
import { pluginsConfigSchema, PluginsConfig, type PluginsConfigType } from './plugins_config';
import { type CliDevConfig } from './types';

export const loadConfig = async ({
  env,
  logger,
  rawConfigAdapter,
}: {
  env: Env;
  logger: Logger;
  rawConfigAdapter: RawConfigAdapter;
}): Promise<CliDevConfig> => {
  const rawConfigService = new RawConfigService(env.configs, rawConfigAdapter);
  rawConfigService.loadConfig();

  const configService = new ConfigService(rawConfigService, env, logger);
  configService.setSchema('dev', devConfigSchema);
  configService.setSchema('plugins', pluginsConfigSchema);
  configService.setSchema('server', httpConfigSchema);

  await configService.validate();

  const devConfig = configService.atPathSync<DevConfigType>('dev');
  const pluginsConfig = configService.atPathSync<PluginsConfigType>('plugins');
  const httpConfig = configService.atPathSync<HttpConfigType>('server');

  return {
    dev: new DevConfig(devConfig),
    plugins: new PluginsConfig(pluginsConfig, env),
    http: new HttpConfig(httpConfig),
  };
};
