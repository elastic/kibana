/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../config/mocks';
import { PluginsConfig, PluginsConfigType } from './plugins_config';
import { Env } from '../config';

describe('PluginsConfig', () => {
  it('retrieves additionalPluginPaths from config.paths when in production mode', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: false } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const config = new PluginsConfig(rawConfig, env);
    expect(config.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });

  it('retrieves additionalPluginPaths from config.paths when in development mode', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: true } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const config = new PluginsConfig(rawConfig, env);
    expect(config.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });
});
