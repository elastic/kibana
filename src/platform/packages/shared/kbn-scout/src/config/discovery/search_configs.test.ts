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

    const configs = getScoutPlaywrightConfigs(['x-pack/plugins'], mockLog);
    expect(configs.size).toBe(0);
  });

  it('should correctly extract item names and group config files', () => {
    (fastGlob.sync as jest.Mock).mockReturnValue([
      'x-pack/platform/plugins/private/plugin_a/test/scout/ui/playwright.config.ts',
      'x-pack/platform/plugins/private/plugin_a/test/scout/ui/parallel.playwright.config.ts',
      'x-pack/platform/packages/shared/package_a/test/scout/api/playwright.config.ts',
      'x-pack/solutions/security/plugins/plugin_b/test/scout/ui/playwright.config.ts',
      'src/platform/plugins/shared/plugin_c/test/scout/ui/playwright.config.ts',
      'src/platform/packages/private/package_b/test/scout/ui/playwright.config.ts',
    ]);

    const configs = getScoutPlaywrightConfigs(['x-pack/', 'src/'], mockLog);

    expect(configs.size).toBe(5);
    expect(configs.get('plugin_a')).toEqual({
      configs: [
        'x-pack/platform/plugins/private/plugin_a/test/scout/ui/playwright.config.ts',
        'x-pack/platform/plugins/private/plugin_a/test/scout/ui/parallel.playwright.config.ts',
      ],
      usesParallelWorkers: true,
      group: 'platform',
      path: 'x-pack/platform/plugins/private/plugin_a',
      type: 'plugin',
    });
    expect(configs.get('plugin_b')).toEqual({
      configs: ['x-pack/solutions/security/plugins/plugin_b/test/scout/ui/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'security',
      path: 'x-pack/solutions/security/plugins/plugin_b',
      type: 'plugin',
    });
    expect(configs.get('plugin_c')).toEqual({
      configs: ['src/platform/plugins/shared/plugin_c/test/scout/ui/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'platform',
      path: 'src/platform/plugins/shared/plugin_c',
      type: 'plugin',
    });
    expect(configs.get('package_a')).toEqual({
      configs: ['x-pack/platform/packages/shared/package_a/test/scout/api/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'platform',
      path: 'x-pack/platform/packages/shared/package_a',
      type: 'package',
    });
    expect(configs.get('package_b')).toEqual({
      configs: ['src/platform/packages/private/package_b/test/scout/ui/playwright.config.ts'],
      usesParallelWorkers: false,
      group: 'platform',
      path: 'src/platform/packages/private/package_b',
      type: 'package',
    });
  });

  it('should log a warning if a file path does not match the expected pattern', () => {
    (fastGlob.sync as jest.Mock).mockReturnValue([
      'x-pack/security/plugins/unknown-path/playwright.config.ts',
    ]);

    const configs = getScoutPlaywrightConfigs(['x-pack/security'], mockLog);

    expect(configs.size).toBe(0);
    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('Unable to extract plugin/package name from path')
    );
  });
});

describe('validateWithScoutCiConfig', () => {
  let mockLog: ToolingLog;
  const mockScoutCiConfig = {
    plugins: {
      enabled: ['pluginA', 'pluginB'],
      disabled: ['pluginC'],
    },
    packages: {
      enabled: ['packageA'],
      disabled: ['packageB'],
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

  it('should return only enabled plugins and packages', () => {
    const scoutConfigs = new Map([
      [
        'pluginA',
        {
          group: 'group1',
          path: 'pluginPathA',
          usesParallelWorkers: true,
          configs: ['configA'],
          type: 'plugin' as const,
        },
      ],
      [
        'pluginB',
        {
          group: 'group1',
          path: 'pluginPathB',
          usesParallelWorkers: false,
          configs: ['configB1', 'configB2'],
          type: 'plugin' as const,
        },
      ],
      [
        'pluginC',
        {
          group: 'group2',
          path: 'pluginPathC',
          usesParallelWorkers: true,
          configs: ['configC'],
          type: 'plugin' as const,
        },
      ],
      [
        'packageA',
        {
          group: 'group1',
          path: 'packagePathA',
          usesParallelWorkers: true,
          configs: ['configA'],
          type: 'package' as const,
        },
      ],
      [
        'packageB',
        {
          group: 'group2',
          path: 'packagePathB',
          usesParallelWorkers: false,
          configs: ['configB'],
          type: 'package' as const,
        },
      ],
    ]);

    const result = validateWithScoutCiConfig(mockLog, scoutConfigs);
    expect(result.size).toBe(3);
    expect(result.has('pluginA')).toBe(true);
    expect(result.has('pluginB')).toBe(true);
    expect(result.has('packageA')).toBe(true);
    expect(result.has('pluginC')).toBe(false);
    expect(result.has('packageB')).toBe(false);
  });

  it('should throw an error if plugins or packages are not registered in Scout CI config', () => {
    const scoutConfigs = new Map([
      [
        'pluginX',
        {
          group: 'groupX',
          path: 'pluginPathX',
          usesParallelWorkers: true,
          configs: ['configX'],
          type: 'plugin' as const,
        },
      ],
      [
        'packageX',
        {
          group: 'groupX',
          path: 'packagePathX',
          usesParallelWorkers: true,
          configs: ['configX'],
          type: 'package' as const,
        },
      ],
    ]);

    expect(() => validateWithScoutCiConfig(mockLog, scoutConfigs)).toThrow(
      "The following plugin(s)/package(s) are not listed in Scout CI config '.buildkite/scout_ci_config.yml':\n- pluginX (plugin)\n- packageX (package)"
    );
  });

  it('should log a warning for disabled plugins and packages', () => {
    const scoutConfigs = new Map([
      [
        'pluginC',
        {
          group: 'group2',
          path: 'pluginPathC',
          usesParallelWorkers: true,
          configs: ['configC'],
          type: 'plugin' as const,
        },
      ],
      [
        'packageB',
        {
          group: 'group2',
          path: 'packagePathB',
          usesParallelWorkers: false,
          configs: ['configB'],
          type: 'package' as const,
        },
      ],
    ]);

    validateWithScoutCiConfig(mockLog, scoutConfigs);

    expect(mockLog.warning).toHaveBeenCalledWith(
      `The following plugin(s)/package(s) are disabled in '.buildkite/scout_ci_config.yml' and will be excluded from CI run\n- pluginC\n- packageB`
    );
  });
});
