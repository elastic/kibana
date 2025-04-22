/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { getScoutPlaywrightConfigs } from '../config';
import { runDiscoverPlaywrightConfigs } from './config_discovery';
import { measurePerformance } from '../common';
import { validateWithScoutCiConfig } from '../config/discovery';

jest.mock('fs');

jest.mock('@kbn/scout-info', () => ({
  SCOUT_PLAYWRIGHT_CONFIGS_PATH: '/path/to/scout_playwright_configs.json',
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

describe('runDiscoverPlaywrightConfigs', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  // 'enabled' plugins
  const mockPluginsWithRunnableConfigs: Map<string, any> = new Map([
    [
      'pluginA',
      {
        group: 'groupA',
        pluginPath: 'plugin/path',
        configs: ['config1.ts', 'config2.ts'],
        usesParallelWorkers: true,
      },
    ],
  ]);

  // these are all the plugins found, but only some of them will be enabled (validateWithScoutCiConfig will find out which ones)
  const mockPluginsWithConfigs = new Map([
    ['pluginA', { group: 'groupA', configs: ['config1.ts', 'config2.ts'] }], // enabled
    ['pluginB', { group: 'groupB', configs: ['config3.ts'] }], // disabled
  ]);

  beforeAll(() => {
    flagsReader = {
      arrayOfStrings: jest.fn(),
      boolean: jest.fn(),
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

    (getScoutPlaywrightConfigs as jest.Mock).mockReturnValue(mockPluginsWithConfigs);
    (validateWithScoutCiConfig as jest.Mock).mockReturnValue(mockPluginsWithRunnableConfigs);
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

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // setting --validate will trigger a validation
    expect(validateWithScoutCiConfig).toHaveBeenCalledWith(log, mockPluginsWithConfigs);
  });

  it('should correctly parse custom config search paths', () => {
    flagsReader.arrayOfStrings.mockReturnValue(['customConfigSearchPaths']);
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

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info.mock.calls).toEqual([
      ["Found Playwright config files in '2' plugins"],
      ['groupA / [pluginA] plugin:'],
      ['- config1.ts'],
      ['- config2.ts'],
      ['groupB / [pluginB] plugin:'],
      ['- config3.ts'],
    ]);
  });

  it('logs "No Playwright config files found" when no configs are found', () => {
    flagsReader.arrayOfStrings.mockReturnValue([]);
    flagsReader.boolean.mockReturnValue(false);

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

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // setting --save will trigger a validation
    expect(validateWithScoutCiConfig).toHaveBeenCalledWith(log, mockPluginsWithConfigs);

    // create directory if it doesn't exist
    expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });

    // we should only write the configs of the plugins that are actually enabled
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/path/to/scout_playwright_configs.json',
      JSON.stringify(Object.fromEntries(mockPluginsWithRunnableConfigs), null, 2)
    );

    expect(log.info).toHaveBeenCalledWith(
      `Found Playwright config files in '2' plugins.\nSaved '1' plugins to '/path/to/scout_playwright_configs.json'`
    );
  });
});
