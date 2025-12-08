/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { measurePerformance } from '../common';
import { getScoutPlaywrightConfigs } from '../config';
import { validateWithScoutCiConfig } from '../config/discovery';
import { runDiscoverPlaywrightConfigs } from './config_discovery';
import { filterConfigsWithTests } from './test_filtering';

jest.mock('fs');

jest.mock('@kbn/scout-info', () => ({
  SCOUT_OUTPUT_ROOT: '/path/to/scout',
  SCOUT_PLAYWRIGHT_CONFIGS_PATH: '/path/to/scout/test_configs/scout_playwright_configs.json',
}));

jest.mock('../common', () => ({
  measurePerformance: jest.fn(),
}));

jest.mock('../config', () => ({
  getScoutPlaywrightConfigs: jest.fn(),
}));

jest.mock('../config/discovery', () => ({
  validateWithScoutCiConfig: jest.fn(),
}));

jest.mock('./test_filtering', () => ({
  filterConfigsWithTests: jest.fn(),
}));

describe('runDiscoverPlaywrightConfigs', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  // 'enabled' items
  const mockScoutConfigs: Map<string, any> = new Map([
    [
      'pluginA',
      {
        group: 'groupA',
        path: 'plugin/path',
        configs: ['config1.ts', 'config2.ts'],
        usesParallelWorkers: true,
        type: 'plugin',
      },
    ],
    [
      'packageA',
      {
        group: 'groupC',
        path: 'package/path',
        configs: ['config4.ts'],
        usesParallelWorkers: false,
        type: 'package',
      },
    ],
  ]);

  // these are all the items found, but only some of them will be enabled (validateWithScoutCiConfig will find out which ones)
  const mockAllConfigs = new Map([
    ['pluginA', { group: 'groupA', configs: ['config1.ts', 'config2.ts'], type: 'plugin' }], // enabled
    ['pluginB', { group: 'groupB', configs: ['config3.ts'], type: 'plugin' }], // disabled
    ['packageA', { group: 'groupB', configs: ['config4.ts'], type: 'package' }], // enabled
    ['packageB', { group: 'groupC', configs: ['config5.ts'], type: 'package' }], // disabled
  ]);

  beforeAll(() => {
    flagsReader = {
      arrayOfStrings: jest.fn(),
      boolean: jest.fn(),
      enum: jest.fn(),
    } as any;

    log = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(jest.fn());
    (fs.writeFileSync as jest.Mock).mockImplementation(jest.fn());

    (measurePerformance as jest.Mock).mockImplementation((_log, _msg, fn) => fn());

    (getScoutPlaywrightConfigs as jest.Mock).mockReturnValue(mockAllConfigs);
    (validateWithScoutCiConfig as jest.Mock).mockReturnValue(mockScoutConfigs);
    (filterConfigsWithTests as jest.Mock).mockReturnValue({
      serverless: {
        search: { tag: '@svlSearch', configs: ['config1.ts'] },
      },
      stateful: {
        platform: { tag: '@ess', configs: ['config2.ts'] },
      },
    });

    // Default to 'local' target
    flagsReader.enum.mockImplementation((flag, options) => {
      if (flag === 'target') {
        return 'local';
      }
      return undefined;
    });
  });

  it('validates configs when "validate" is true', () => {
    // force --validate
    flagsReader.boolean.mockImplementation((flag) => {
      if (flag === 'save') {
        return false;
      }

      // force --validate
      if (flag === 'validate') {
        return true;
      }

      return false;
    });

    flagsReader.enum.mockReturnValue('local');

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // setting --validate will trigger a validation
    expect(validateWithScoutCiConfig).toHaveBeenCalledWith(log, mockAllConfigs);
  });

  it('should correctly parse custom config search paths', () => {
    flagsReader.arrayOfStrings.mockReturnValue(['customConfigSearchPaths']);
    flagsReader.enum.mockReturnValue('local');
    runDiscoverPlaywrightConfigs(flagsReader, log);
    expect(getScoutPlaywrightConfigs).toHaveBeenCalledWith(['customConfigSearchPaths'], log);
  });

  it('logs found configs when they exist and "save" flag is false', () => {
    flagsReader.boolean.mockImplementation((flag) => {
      // never --save
      if (flag === 'save') {
        return false;
      }

      if (flag === 'validate') {
        return false;
      }

      return false;
    });

    flagsReader.enum.mockReturnValue('local');

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info.mock.calls).toEqual([
      ['Found Playwright config files in 2 plugin(s) and 2 package(s)'],
      ['groupA / [pluginA] plugin:'],
      ['- config1.ts'],
      ['- config2.ts'],
      ['groupB / [pluginB] plugin:'],
      ['- config3.ts'],
      ['groupB / [packageA] package:'],
      ['- config4.ts'],
      ['groupC / [packageB] package:'],
      ['- config5.ts'],
    ]);
  });

  it('logs "No Playwright config files found" when no configs are found', () => {
    flagsReader.arrayOfStrings.mockReturnValue([]);
    flagsReader.boolean.mockReturnValue(false);
    flagsReader.enum.mockReturnValue('local');

    (getScoutPlaywrightConfigs as jest.Mock).mockReturnValue(new Map());
    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info).toHaveBeenCalledWith('No Playwright config files found');
  });

  it('validates and saves enabled plugins with their config files when --save is set', () => {
    // force --save
    flagsReader.boolean.mockImplementation((flag) => {
      if (flag === 'save') {
        return true;
      }

      if (flag === 'validate') {
        return false;
      }

      return false;
    });

    flagsReader.arrayOfStrings.mockReturnValue(['searchPaths']);
    flagsReader.enum.mockReturnValue('local');

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // setting --save will trigger a validation
    expect(validateWithScoutCiConfig).toHaveBeenCalledWith(log, mockAllConfigs);

    // create directory if it doesn't exist
    expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/scout/test_configs', { recursive: true });

    // we should only write the configs of the items that are actually enabled
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/path/to/scout/test_configs/scout_playwright_configs.json',
      JSON.stringify(Object.fromEntries(mockScoutConfigs), null, 2)
    );

    expect(log.info).toHaveBeenCalledWith(
      `Found Playwright config files in 2 plugin(s) and 2 package(s).\nSaved 1 plugin(s) and 1 package(s) to '/path/to/scout/test_configs/scout_playwright_configs.json'`
    );
  });

  it('handles both plugins and packages correctly', () => {
    // Test data with both plugins and packages
    const mixedConfigs = new Map([
      ['pluginX', { group: 'solution1', configs: ['plugin.config.ts'], type: 'plugin' }],
      ['packageY', { group: 'platform', configs: ['package.config.ts'], type: 'package' }],
    ]);

    (getScoutPlaywrightConfigs as jest.Mock).mockReturnValue(mixedConfigs);
    (validateWithScoutCiConfig as jest.Mock).mockReturnValue(mixedConfigs);

    flagsReader.boolean.mockReturnValue(false);
    flagsReader.arrayOfStrings.mockReturnValue([]);
    flagsReader.enum.mockReturnValue('local');

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info.mock.calls).toEqual([
      ['Found Playwright config files in 1 plugin(s) and 1 package(s)'],
      ['solution1 / [pluginX] plugin:'],
      ['- plugin.config.ts'],
      ['platform / [packageY] package:'],
      ['- package.config.ts'],
    ]);
  });

  it('handles package-only scenarios', () => {
    // Test data with only packages
    const packageOnlyConfigs = new Map([
      ['packageA', { group: 'platform', configs: ['config1.ts', 'config2.ts'], type: 'package' }],
      ['packageB', { group: 'security', configs: ['config3.ts'], type: 'package' }],
    ]);

    (getScoutPlaywrightConfigs as jest.Mock).mockReturnValue(packageOnlyConfigs);
    (validateWithScoutCiConfig as jest.Mock).mockReturnValue(packageOnlyConfigs);

    flagsReader.boolean.mockReturnValue(false);
    flagsReader.arrayOfStrings.mockReturnValue([]);
    flagsReader.enum.mockReturnValue('local');

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info.mock.calls).toEqual([
      ['Found Playwright config files in 0 plugin(s) and 2 package(s)'],
      ['platform / [packageA] package:'],
      ['- config1.ts'],
      ['- config2.ts'],
      ['security / [packageB] package:'],
      ['- config3.ts'],
    ]);
  });

  describe('cloud target', () => {
    const mockFilteredConfigs = {
      serverless: {
        search: {
          tag: '@svlSearch',
          configs: ['config1.ts', 'config2.ts'],
        },
      },
      stateful: {
        platform: {
          tag: '@ess',
          configs: ['config3.ts'],
        },
      },
    };

    beforeEach(() => {
      (filterConfigsWithTests as jest.Mock).mockReturnValue(mockFilteredConfigs);
      flagsReader.enum.mockReturnValue('cloud');
    });

    it('filters and saves cloud configs when target is cloud', () => {
      flagsReader.arrayOfStrings.mockReturnValue(['searchPaths']);

      runDiscoverPlaywrightConfigs(flagsReader, log);

      expect(filterConfigsWithTests).toHaveBeenCalledWith(mockAllConfigs, log);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/scout', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/scout/scout_cloud_run_config.json',
        JSON.stringify(mockFilteredConfigs, null, 2)
      );
      expect(log.info).toHaveBeenCalledWith(
        "Saved filtered cloud configs to '/path/to/scout/scout_cloud_run_config.json'"
      );
    });

    it('does not validate or list configs when target is cloud', () => {
      flagsReader.arrayOfStrings.mockReturnValue(['searchPaths']);
      flagsReader.boolean.mockReturnValue(false);

      runDiscoverPlaywrightConfigs(flagsReader, log);

      expect(validateWithScoutCiConfig).not.toHaveBeenCalled();
      expect(log.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Found Playwright config files')
      );
    });

    it('ignores save and validate flags when target is cloud', () => {
      flagsReader.arrayOfStrings.mockReturnValue(['searchPaths']);
      flagsReader.boolean.mockImplementation((flag) => {
        if (flag === 'save' || flag === 'validate') {
          return true;
        }
        return false;
      });

      runDiscoverPlaywrightConfigs(flagsReader, log);

      expect(validateWithScoutCiConfig).not.toHaveBeenCalled();
      expect(filterConfigsWithTests).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/scout/scout_cloud_run_config.json',
        expect.any(String)
      );
    });
  });
});
