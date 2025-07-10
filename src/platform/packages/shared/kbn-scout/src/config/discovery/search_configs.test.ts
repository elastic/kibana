/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastGlob from 'fast-glob';
import yaml from 'js-yaml';
import { ToolingLog } from '@kbn/tooling-log';
import { getScoutPlaywrightConfigs, validateWithScoutCiConfig } from './search_configs';

jest.mock('fast-glob');
jest.mock('js-yaml');

describe('getScoutPlaywrightConfigs', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'info').mockImplementation(() => {});
    jest.spyOn(mockLog, 'warning').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty map if no matching files are found', () => {
    (fastGlob.sync as jest.Mock).mockReturnValueOnce([]);

    const plugins = getScoutPlaywrightConfigs(['x-pack/plugins'], mockLog);
    expect(plugins.size).toBe(0);
  });

  it('should correctly extract plugin names and group config files', () => {
    (fastGlob.sync as jest.Mock).mockReturnValue([
      'x-pack/platform/plugins/private/plugin_a/test/scout/ui/playwright.config.ts',
      'x-pack/platform/plugins/private/plugin_a/test/scout/ui/parallel.playwright.config.ts',
      'x-pack/solutions/security/plugins/plugin_b/test/scout/ui/playwright.config.ts',
      'src/platform/plugins/shared/plugin_c/test/scout/ui/playwright.config.ts',
    ]);

    const plugins = getScoutPlaywrightConfigs(['x-pack/', 'src/'], mockLog);

    expect(plugins.size).toBe(3);
    expect(plugins.get('plugin_a')).toEqual({
      configs: [
        'x-pack/platform/plugins/private/plugin_a/test/scout/ui/playwright.config.ts',
        'x-pack/platform/plugins/private/plugin_a/test/scout/ui/parallel.playwright.config.ts',
      ],
      usesParallelWorkers: true,
      group: 'platform',
      pluginPath: 'x-pack/platform/plugins/private/plugin_a',
    });
    expect(plugins.get('plugin_b')).toEqual({
      configs: ['x-pack/solutions/security/plugins/plugin_b/test/scout/ui/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'security',
      pluginPath: 'x-pack/solutions/security/plugins/plugin_b',
    });
    expect(plugins.get('plugin_c')).toEqual({
      configs: ['src/platform/plugins/shared/plugin_c/test/scout/ui/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'platform',
      pluginPath: 'src/platform/plugins/shared/plugin_c',
    });
  });

  it('should log a warning if a file path does not match the expected pattern', () => {
    (fastGlob.sync as jest.Mock).mockReturnValue([
      'x-pack/security/plugins/unknown-path/playwright.config.ts',
    ]);

    const plugins = getScoutPlaywrightConfigs(['x-pack/security'], mockLog);

    expect(plugins.size).toBe(0);
    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('Unable to extract plugin name from path')
    );
  });
});

describe('validateWithScoutCiConfig', () => {
  let mockLog: ToolingLog;
  const mockScoutCiConfig = {
    ui_tests: {
      enabled: ['pluginA', 'pluginB'],
      disabled: ['pluginC'],
    },
  };

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'warning').mockImplementation(jest.fn());
    (yaml.load as jest.Mock).mockReturnValue(mockScoutCiConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return only enabled plugins', () => {
    const pluginsWithConfigs = new Map([
      [
        'pluginA',
        {
          group: 'group1',
          pluginPath: 'pluginPathA',
          usesParallelWorkers: true,
          configs: ['configA'],
        },
      ],
      [
        'pluginB',
        {
          group: 'group1',
          pluginPath: 'pluginPathB',
          usesParallelWorkers: false,
          configs: ['configB1', 'configB2'],
        },
      ],
      [
        'pluginC',
        {
          group: 'group2',
          pluginPath: 'pluginPathC',
          usesParallelWorkers: true,
          configs: ['configC'],
        },
      ],
    ]);

    const result = validateWithScoutCiConfig(mockLog, pluginsWithConfigs);
    expect(result.size).toBe(2);
    expect(result.has('pluginA')).toBe(true);
    expect(result.has('pluginB')).toBe(true);
    expect(result.has('pluginC')).toBe(false);
  });

  it('should throw an error if plugins are not registered in Scout CI config', () => {
    const pluginsWithConfigs = new Map([
      [
        'pluginX',
        {
          group: 'groupX',
          pluginPath: 'pluginPathX',
          usesParallelWorkers: true,
          configs: ['configX'],
        },
      ],
    ]);

    expect(() => validateWithScoutCiConfig(mockLog, pluginsWithConfigs)).toThrow(
      "The following plugins are not registered in Scout CI config '.buildkite/scout_ci_config.yml':\n- pluginX"
    );
  });

  it('should log a warning for disabled plugins', () => {
    const pluginsWithConfigs = new Map([
      [
        'pluginC',
        {
          group: 'group2',
          pluginPath: 'pluginPathC',
          usesParallelWorkers: true,
          configs: ['configC'],
        },
      ],
    ]);

    validateWithScoutCiConfig(mockLog, pluginsWithConfigs);

    expect(mockLog.warning).toHaveBeenCalledWith(
      `The following plugins are disabled in '.buildkite/scout_ci_config.yml' and will be excluded from CI run\n- pluginC`
    );
  });
});
