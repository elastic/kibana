/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import type { PluginsConfigType } from './plugins_config';
import { PluginsConfig, config } from './plugins_config';

describe('PluginsConfig', () => {
  it('retrieves additionalPluginPaths from config.paths when in production mode', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: false } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const pluginsConfig = new PluginsConfig(rawConfig, env);
    expect(pluginsConfig.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });

  it('retrieves additionalPluginPaths from config.paths when in development mode', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: true } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const pluginsConfig = new PluginsConfig(rawConfig, env);
    expect(pluginsConfig.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });

  it('retrieves shouldEnableAllPlugins', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: true } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
      forceEnableAllPlugins: true,
    };
    const pluginsConfig = new PluginsConfig(rawConfig, env);
    expect(pluginsConfig.shouldEnableAllPlugins).toEqual(true);
  });

  it('retrieves included plugin groups', () => {
    const env = Env.createDefault(REPO_ROOT, getEnvOptions({ cliArgs: { dev: true } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
      forceEnableAllPlugins: true,
      allowlistPluginGroups: ['search'],
    };
    const pluginsConfig = new PluginsConfig(rawConfig, env);
    expect(pluginsConfig.allowlistPluginGroups).toEqual(['search']);
  });

  describe('schema validation', () => {
    it('accepts featureFlags.enableAllFlags as optional boolean', () => {
      const validConfig = {
        initialize: true,
        paths: [],
        featureFlags: {
          enableAllFlags: true,
        },
      };

      expect(() => config.schema.validate(validConfig)).not.toThrow();
    });

    it('accepts valid config without featureFlags object', () => {
      const validConfig = {
        initialize: true,
        paths: [],
      };

      expect(() => config.schema.validate(validConfig)).not.toThrow();
    });

    it('fails validation with invalid featureFlags.enableAllFlags type', () => {
      const invalidConfig = {
        initialize: true,
        paths: [],
        featureFlags: {
          enableAllFlags: 'not-a-boolean',
        },
      };

      expect(() => config.schema.validate(invalidConfig)).toThrow();
    });
  });
});
