/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { filterModulesByScoutCiConfig } from '../config/discovery';
import type { ModuleDiscoveryInfo } from './config_discovery';
import { runDiscoverPlaywrightConfigs } from './config_discovery';

jest.mock('fs');

jest.mock('@kbn/scout-info', () => ({
  SCOUT_PLAYWRIGHT_CONFIGS_PATH: '/path/to/scout_playwright_configs.json',
}));

let mockTestableModules: any[] = [];

jest.mock('@kbn/scout-reporting/src/registry', () => ({
  testableModules: {
    get allIncludingConfigs() {
      return mockTestableModules;
    },
  },
}));

jest.mock('../config/discovery', () => ({
  filterModulesByScoutCiConfig: jest.fn(),
}));

describe('runDiscoverPlaywrightConfigs', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  const mockFilteredModules: ModuleDiscoveryInfo[] = [
    {
      name: 'pluginA',
      group: 'groupA',
      type: 'plugin',
      visibility: 'private',
      configs: [
        {
          path: 'pluginA/config1.playwright.config.ts',
          hasTests: true,
          tags: ['@ess', '@svlOblt'],
          usesParallelWorkers: false,
        },
      ],
    },
  ];

  beforeAll(() => {
    flagsReader = {
      enum: jest.fn(),
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

    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);
    flagsReader.arrayOfStrings.mockReturnValue([]);

    (filterModulesByScoutCiConfig as jest.Mock).mockReturnValue(mockFilteredModules);

    // Default mock modules
    mockTestableModules = [
      {
        name: 'pluginA',
        group: 'groupA',
        type: 'plugin' as const,
        visibility: 'private' as const,
        configs: [
          {
            path: 'pluginA/config1.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'passed',
                  location: { file: 'test1.spec.ts' },
                  tags: ['@ess', '@svlOblt'],
                },
                {
                  expectedStatus: 'passed',
                  location: { file: 'test2.spec.ts' },
                  tags: ['@svlSecurity'],
                },
              ],
            },
          },
          {
            path: 'pluginA/parallel.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'passed',
                  location: { file: 'test3.spec.ts' },
                  tags: ['@svlSearch'],
                },
              ],
            },
          },
        ],
      },
      {
        name: 'pluginB',
        group: 'groupB',
        type: 'plugin' as const,
        visibility: 'shared' as const,
        configs: [
          {
            path: 'pluginB/config3.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'passed',
                  location: { file: 'test4.spec.ts' },
                  tags: ['@svlWorkplaceAI'], // Only serverless, not in DEPLOYMENT_AGNOSTIC
                },
              ],
            },
          },
        ],
      },
      {
        name: 'packageA',
        group: 'groupC',
        type: 'package' as const,
        visibility: 'shared' as const,
        configs: [
          {
            path: 'packageA/config4.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'passed',
                  location: { file: 'test5.spec.ts' },
                  tags: ['@ess', '@svlOblt'],
                },
              ],
            },
          },
        ],
      },
    ];
  });

  it('validates configs when "validate" is true', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockImplementation((flag) => {
      if (flag === 'save') return false;
      if (flag === 'validate') return true;
      return false;
    });

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(filterModulesByScoutCiConfig).toHaveBeenCalled();
    const callArgs = (filterModulesByScoutCiConfig as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe(log);
    expect(Array.isArray(callArgs[1])).toBe(true);
  });

  it('filters configs based on target tags for "all" target (DEPLOYMENT_AGNOSTIC)', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // pluginA has @ess, @svlOblt, @svlSecurity, @svlSearch which are in DEPLOYMENT_AGNOSTIC
    // pluginB has @svlWorkplaceAI which is NOT in DEPLOYMENT_AGNOSTIC, it should be excluded
    // packageA has @ess and @svlOblt which are in DEPLOYMENT_AGNOSTIC

    const infoCalls = log.info.mock.calls;
    const foundMessage = infoCalls.find((call) =>
      call[0].includes('Found Playwright config files')
    );
    expect(foundMessage).toBeDefined();
    expect(foundMessage![0]).toContain('1 plugin(s)'); // pluginA only (pluginB filtered out)
    expect(foundMessage![0]).toContain('1 package(s)'); // packageA
  });

  it('filters configs based on target tags for "mki" target (SERVERLESS_ONLY)', () => {
    flagsReader.enum.mockReturnValue('mki');
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // pluginA has @svlOblt, @svlSecurity, @svlSearch which are in SERVERLESS_ONLY
    // pluginB has @svlWorkplaceAI which is in SERVERLESS_ONLY
    // packageA has @svlOblt which is in SERVERLESS_ONLY

    const infoCalls = log.info.mock.calls;
    const foundMessage = infoCalls.find((call) =>
      call[0].includes('Found Playwright config files')
    );
    expect(foundMessage).toBeDefined();
    // All modules should be included for mki target
    expect(foundMessage![0]).toContain('2 plugin(s)');
    expect(foundMessage![0]).toContain('1 package(s)');
  });

  it('filters configs based on target tags for "ech" target (ESS_ONLY)', () => {
    flagsReader.enum.mockReturnValue('ech');
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // pluginA has @ess which is in ESS_ONLY
    // pluginB has no @ess, it should be excluded
    // packageA has @ess which is in ESS_ONLY

    const infoCalls = log.info.mock.calls;
    const foundMessage = infoCalls.find((call) =>
      call[0].includes('Found Playwright config files')
    );
    expect(foundMessage).toBeDefined();
    expect(foundMessage![0]).toContain('1 plugin(s)'); // pluginA only
    expect(foundMessage![0]).toContain('1 package(s)'); // packageA
  });

  it('filters config tags to only include cross tags', () => {
    flagsReader.enum.mockReturnValue('ech'); // ESS_ONLY = ['@ess']
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // Find the log call that shows config details
    const infoCalls = log.info.mock.calls;
    const configLogCall = infoCalls.find((call) =>
      call[0].includes('config1.playwright.config.ts')
    );

    expect(configLogCall).toBeDefined();
    // pluginA config1 has tags ['@ess', '@svlOblt', '@svlSecurity'], but after filtering for ESS_ONLY, only ['@ess'] should remain
    expect(configLogCall![0]).toContain('tags: [@ess]');
    expect(configLogCall![0]).not.toContain('@svlOblt');
    expect(configLogCall![0]).not.toContain('@svlSecurity');
  });

  it('logs found configs with tags when they exist and "save" flag is false', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    const infoCalls = log.info.mock.calls;
    expect(infoCalls.length).toBeGreaterThan(0);
    expect(infoCalls[0][0]).toContain('Found Playwright config files');

    // Check that config logs include tags
    const configLogs = infoCalls.filter((call) => call[0].startsWith('- '));
    expect(configLogs.length).toBeGreaterThan(0);
    configLogs.forEach((call) => {
      expect(call[0]).toContain('tags: [');
    });
  });

  it('logs "No Playwright config files found" when no configs match target tags', () => {
    flagsReader.enum.mockReturnValue('ech'); // ESS_ONLY
    flagsReader.boolean.mockReturnValue(false);

    // Set up modules with no matching tags
    mockTestableModules = [
      {
        name: 'pluginNoMatch',
        group: 'groupX',
        type: 'plugin' as const,
        visibility: 'private' as const,
        configs: [
          {
            path: 'pluginNoMatch/config.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'passed',
                  location: { file: 'test.spec.ts' },
                  tags: ['@svlWorkplaceAI'], // Not in ESS_ONLY
                },
              ],
            },
          },
        ],
      },
    ];

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(log.info).toHaveBeenCalledWith('No Playwright config files found');
  });

  it('validates and saves filtered modules when --save is set', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockImplementation((flag) => {
      if (flag === 'save') return true;
      if (flag === 'validate') return false;
      return false;
    });

    runDiscoverPlaywrightConfigs(flagsReader, log);

    expect(filterModulesByScoutCiConfig).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    expect(writeCall[0]).toBe('/path/to/scout_playwright_configs.json');
    const savedData = JSON.parse(writeCall[1]);
    expect(Array.isArray(savedData)).toBe(true);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('Scout configs were filtered for CI. Saved')
    );
  });

  it('filters out modules with no matching configs after tag filtering', () => {
    flagsReader.enum.mockReturnValue('ech'); // ESS_ONLY = ['@ess']
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // pluginB has @svlWorkplaceAI which is not in ESS_ONLY, it should be filtered out
    const infoCalls = log.info.mock.calls;
    const moduleLogs = infoCalls.filter(
      (call) => call[0].includes('] plugin:') || call[0].includes('] package:')
    );

    // Should not contain pluginB
    const pluginBLog = moduleLogs.find((call) => call[0].includes('pluginB'));
    expect(pluginBLog).toBeUndefined();
  });

  it('handles configs with no passed tests correctly', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    // Set up a module with a config that has no passed tests
    mockTestableModules = [
      {
        name: 'pluginNoTests',
        group: 'groupY',
        type: 'plugin' as const,
        visibility: 'private' as const,
        configs: [
          {
            path: 'pluginNoTests/config.playwright.config.ts',
            manifest: {
              tests: [
                {
                  expectedStatus: 'failed',
                  location: { file: 'test.spec.ts' },
                  tags: ['@ess'],
                },
              ],
            },
          },
        ],
      },
    ];

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // Configs with no passed tests should still be included if they have matching tags
    const infoCalls = log.info.mock.calls;
    expect(infoCalls.length).toBeGreaterThan(0);
  });

  it('correctly identifies parallel worker configs', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // The parallel config should be identified
    const infoCalls = log.info.mock.calls;
    const parallelConfigLog = infoCalls.find((call) =>
      call[0].includes('parallel.playwright.config.ts')
    );
    expect(parallelConfigLog).toBeDefined();
  });
});
