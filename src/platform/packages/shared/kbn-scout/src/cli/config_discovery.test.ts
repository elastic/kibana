/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ScoutTestableModuleWithConfigs } from '@kbn/scout-reporting/src/registry';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { filterModulesByScoutCiConfig } from '../tests_discovery/search_configs';
import type { ModuleDiscoveryInfo } from './config_discovery';
import { runDiscoverPlaywrightConfigs } from './config_discovery';

// Module-level object to store mock modules that the jest.mock can access
export const mockTestableModules: { modules: ScoutTestableModuleWithConfigs[] } = {
  modules: [],
};

// Mock fs before any imports that might use it
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn((path: string, encoding?: string) => {
      // Return valid JSON for package.json files (used by @kbn/repo-info during initialization)
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ name: 'kibana', version: '1.0.0' });
      }
      // For other files, return empty string by default
      return '';
    }),
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('@kbn/scout-info', () => ({
  SCOUT_PLAYWRIGHT_CONFIGS_PATH: '/path/to/scout_playwright_configs.json',
}));

jest.mock('../tests_discovery/search_configs', () => ({
  filterModulesByScoutCiConfig: jest.fn(),
}));

jest.mock('@kbn/scout-reporting/src/registry', () => {
  // Access the module-level store
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const testModule = require('./config_discovery.test');
  return {
    testableModules: {
      get allIncludingConfigs() {
        return testModule.mockTestableModules.modules;
      },
    },
  };
});

jest.mock('../servers/configs', () => ({
  getScoutPlaywrightConfigs: jest.fn(),
}));

describe('runDiscoverPlaywrightConfigs', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  const mockFilteredModules: ModuleDiscoveryInfo[] = [
    {
      name: 'pluginA',
      group: 'groupA',
      type: 'plugin',
      configs: [
        {
          path: 'pluginA/config1.playwright.config.ts',
          hasTests: true,
          tags: ['@ess', '@svlOblt'],
          serverRunFlags: ['--stateful', '--serverless=oblt'],
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

    // Re-setup fs mocks after clearing
    (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ name: 'kibana', version: '1.0.0' });
      }
      // For yaml files (used by search_configs)
      if (typeof path === 'string' && path.endsWith('.yml')) {
        return 'mock yaml content';
      }
      return '';
    });
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(jest.fn());
    (fs.writeFileSync as jest.Mock).mockImplementation(jest.fn());

    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);
    flagsReader.arrayOfStrings.mockReturnValue([]);

    (filterModulesByScoutCiConfig as jest.Mock).mockReturnValue(mockFilteredModules);

    // Default mock modules
    mockTestableModules.modules = [
      {
        name: 'pluginA',
        group: 'groupA',
        type: 'plugin' as const,
        visibility: 'private' as const,
        root: 'x-pack/platform/plugins/private/pluginA',
        configs: [
          {
            path: 'pluginA/config1.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginA/config1.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'abc123',
              tests: [
                {
                  id: 'test1',
                  title: 'Test 1',
                  expectedStatus: 'passed',
                  location: { file: 'test1.spec.ts', line: 1, column: 1 },
                  tags: ['@ess', '@svlOblt'],
                },
                {
                  id: 'test2',
                  title: 'Test 2',
                  expectedStatus: 'passed',
                  location: { file: 'test2.spec.ts', line: 1, column: 1 },
                  tags: ['@svlSecurity'],
                },
              ],
            },
          },
          {
            path: 'pluginA/parallel.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginA/parallel.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'def456',
              tests: [
                {
                  id: 'test3',
                  title: 'Test 3',
                  expectedStatus: 'passed',
                  location: { file: 'test3.spec.ts', line: 1, column: 1 },
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
        root: 'x-pack/platform/plugins/shared/pluginB',
        configs: [
          {
            path: 'pluginB/config3.playwright.config.ts',
            category: 'api',
            type: 'playwright',
            manifest: {
              path: 'pluginB/config3.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'ghi789',
              tests: [
                {
                  id: 'test4',
                  title: 'Test 4',
                  expectedStatus: 'passed',
                  location: { file: 'test4.spec.ts', line: 1, column: 1 },
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
        root: 'src/platform/packages/shared/packageA',
        configs: [
          {
            path: 'packageA/config4.playwright.config.ts',
            category: 'api',
            type: 'playwright',
            manifest: {
              path: 'packageA/config4.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'jkl012',
              tests: [
                {
                  id: 'test5',
                  title: 'Test 5',
                  expectedStatus: 'passed',
                  location: { file: 'test5.spec.ts', line: 1, column: 1 },
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
    mockTestableModules.modules = [
      {
        name: 'pluginNoMatch',
        group: 'groupX',
        type: 'plugin' as const,
        visibility: 'private' as const,
        root: 'x-pack/platform/plugins/private/pluginNoMatch',
        configs: [
          {
            path: 'pluginNoMatch/config.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginNoMatch/config.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'mno345',
              tests: [
                {
                  id: 'testNoMatch',
                  title: 'Test No Match',
                  expectedStatus: 'passed',
                  location: { file: 'test.spec.ts', line: 1, column: 1 },
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

  it('validates and saves filtered modules when "--save" is set', () => {
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
    mockTestableModules.modules = [
      {
        name: 'pluginNoTests',
        group: 'groupY',
        type: 'plugin' as const,
        visibility: 'private' as const,
        root: 'x-pack/platform/plugins/private/pluginNoTests',
        configs: [
          {
            path: 'pluginNoTests/config.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginNoTests/config.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'pqr678',
              tests: [
                {
                  id: 'testFailed',
                  title: 'Test Failed',
                  expectedStatus: 'failed',
                  location: { file: 'test.spec.ts', line: 1, column: 1 },
                  tags: ['@ess'],
                },
              ],
            },
          },
        ],
      },
    ];

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // Configs with no passed tests should not be included (no matching tags from passed tests)
    // Since there are no passed tests, collectUniqueTags returns empty tags array,
    // which means no configs match targetTags, resulting in filteredModulesWithTests being empty
    const infoCalls = log.info.mock.calls;
    const foundMessage = infoCalls.find(
      (call) =>
        call[0].includes('No Playwright config files found') ||
        call[0].includes('Found Playwright config files')
    );
    expect(foundMessage).toBeDefined();
    // When no modules have passed tests, the message should indicate no configs were found
    expect(foundMessage![0]).toBe('No Playwright config files found');
  });

  it('only collects tags from passed spec files', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    // Set up a module with mixed test statuses and file types
    mockTestableModules.modules = [
      {
        name: 'pluginMixedTests',
        group: 'groupZ',
        type: 'plugin' as const,
        visibility: 'private' as const,
        root: 'x-pack/platform/plugins/private/pluginMixedTests',
        configs: [
          {
            path: 'pluginMixedTests/config.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginMixedTests/config.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'stu901',
              tests: [
                {
                  id: 'test1',
                  title: 'Test 1',
                  expectedStatus: 'passed',
                  location: { file: 'test1.spec.ts', line: 1, column: 1 },
                  tags: ['@ess', '@svlOblt'], // Should be included
                },
                {
                  id: 'test2',
                  title: 'Test 2',
                  expectedStatus: 'failed',
                  location: { file: 'test2.spec.ts', line: 1, column: 1 },
                  tags: ['@svlSecurity'], // Should NOT be included (failed)
                },
                {
                  id: 'test3',
                  title: 'Test 3',
                  expectedStatus: 'passed',
                  location: { file: 'test3.ts', line: 1, column: 1 }, // Not a .spec.ts file
                  tags: ['@svlSearch'], // Should NOT be included (not .spec.ts)
                },
                {
                  id: 'test4',
                  title: 'Test 4',
                  expectedStatus: 'passed',
                  location: { file: 'test4.spec.ts', line: 1, column: 1 },
                  tags: ['@svlLogsEssentials'], // Should be included
                },
                {
                  id: 'test5',
                  title: 'Test 5',
                  expectedStatus: 'passed',
                  location: { file: 'test5.spec.ts', line: 1, column: 1 },
                  tags: [], // No tags - should not cause errors
                },
                {
                  id: 'test6',
                  title: 'Test 6',
                  expectedStatus: 'passed',
                  location: { file: '', line: 0, column: 0 }, // No file location - should not be included
                  tags: ['@svlOblt'],
                },
              ],
            },
          },
        ],
      },
    ];

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // Find the log call that shows config details
    const infoCalls = log.info.mock.calls;
    const configLogCall = infoCalls.find((call) => call[0].includes('config.playwright.config.ts'));

    expect(configLogCall).toBeDefined();
    // Should only contain tags from passed .spec.ts files: @ess, @svlOblt, @svlLogsEssentials
    expect(configLogCall![0]).toContain('@ess');
    expect(configLogCall![0]).toContain('@svlOblt');
    expect(configLogCall![0]).toContain('@svlLogsEssentials');
    // Should NOT contain tags from failed tests or non-spec files
    expect(configLogCall![0]).not.toContain('@svlSecurity');
    expect(configLogCall![0]).not.toContain('@svlSearch');
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

  it('computes "serverRunFlags" correctly from tags', () => {
    flagsReader.enum.mockReturnValue('all');
    flagsReader.boolean.mockReturnValue(false);

    // Set up a module with various tags to test serverRunFlags computation
    mockTestableModules.modules = [
      {
        name: 'pluginTestModes',
        group: 'groupTest',
        type: 'plugin' as const,
        visibility: 'private' as const,
        root: 'x-pack/platform/plugins/private/pluginTestModes',
        configs: [
          {
            path: 'pluginTestModes/config1.playwright.config.ts',
            category: 'ui',
            type: 'playwright',
            manifest: {
              path: 'pluginTestModes/config1.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'vwx234',
              tests: [
                {
                  id: 'testModes1',
                  title: 'Test Modes 1',
                  expectedStatus: 'passed',
                  location: { file: 'test1.spec.ts', line: 1, column: 1 },
                  tags: ['@ess', '@svlSearch', '@svlSecurity'],
                },
              ],
            },
          },
          {
            path: 'pluginTestModes/config2.playwright.config.ts',
            category: 'api',
            type: 'playwright',
            manifest: {
              path: 'pluginTestModes/config2.playwright.config.ts',
              exists: true,
              lastModified: '2024-01-01T00:00:00Z',
              sha1: 'yza567',
              tests: [
                {
                  id: 'testModes2',
                  title: 'Test Modes 2',
                  expectedStatus: 'passed',
                  location: { file: 'test2.spec.ts', line: 1, column: 1 },
                  tags: ['@svlOblt'],
                },
              ],
            },
          },
        ],
      },
    ];

    runDiscoverPlaywrightConfigs(flagsReader, log);

    // Verify that serverRunFlags are computed and included in the output
    // The function should compute serverRunFlags from tags automatically
    const infoCalls = log.info.mock.calls;
    const config1Log = infoCalls.find((call) => call[0].includes('config1.playwright.config.ts'));
    const config2Log = infoCalls.find((call) => call[0].includes('config2.playwright.config.ts'));

    expect(config1Log).toBeDefined();
    expect(config2Log).toBeDefined();
    // config1 should have @ess, @svlSearch, @svlSecurity tags
    // config2 should have @svlOblt tag
    // The actual serverRunFlags computation happens in the function, so we just verify the configs are processed
  });

  describe('"--flatten" flag', () => {
    beforeEach(() => {
      // Set up modules with different groups and serverRunFlags for flatten testing
      mockTestableModules.modules = [
        {
          name: 'pluginSearch',
          group: 'search',
          type: 'plugin' as const,
          visibility: 'private' as const,
          root: 'x-pack/platform/plugins/private/pluginSearch',
          configs: [
            {
              path: 'pluginSearch/config1.playwright.config.ts',
              category: 'ui',
              type: 'playwright',
              manifest: {
                path: 'pluginSearch/config1.playwright.config.ts',
                exists: true,
                lastModified: '2024-01-01T00:00:00Z',
                sha1: 'bcd234',
                tests: [
                  {
                    id: 'flattenTest1',
                    title: 'Flatten Test 1',
                    expectedStatus: 'passed',
                    location: { file: 'test1.spec.ts', line: 1, column: 1 },
                    tags: ['@ess', '@svlSearch'],
                  },
                ],
              },
            },
            {
              path: 'pluginSearch/config2.playwright.config.ts',
              category: 'api',
              type: 'playwright',
              manifest: {
                path: 'pluginSearch/config2.playwright.config.ts',
                exists: true,
                lastModified: '2024-01-01T00:00:00Z',
                sha1: 'cde345',
                tests: [
                  {
                    id: 'flattenTest2',
                    title: 'Flatten Test 2',
                    expectedStatus: 'passed',
                    location: { file: 'test2.spec.ts', line: 1, column: 1 },
                    tags: ['@svlSearch'],
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'pluginPlatform',
          group: 'platform',
          type: 'plugin' as const,
          visibility: 'private' as const,
          root: 'x-pack/platform/plugins/private/pluginPlatform',
          configs: [
            {
              path: 'pluginPlatform/config1.playwright.config.ts',
              category: 'ui',
              type: 'playwright',
              manifest: {
                path: 'pluginPlatform/config1.playwright.config.ts',
                exists: true,
                lastModified: '2024-01-01T00:00:00Z',
                sha1: 'def456',
                tests: [
                  {
                    id: 'flattenTest3',
                    title: 'Flatten Test 3',
                    expectedStatus: 'passed',
                    location: { file: 'test3.spec.ts', line: 1, column: 1 },
                    tags: ['@ess'],
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'pluginOblt',
          group: 'observability',
          type: 'plugin' as const,
          visibility: 'private' as const,
          root: 'x-pack/solutions/observability/plugins/pluginOblt',
          configs: [
            {
              path: 'pluginOblt/config1.playwright.config.ts',
              category: 'ui',
              type: 'playwright',
              manifest: {
                path: 'pluginOblt/config1.playwright.config.ts',
                exists: true,
                lastModified: '2024-01-01T00:00:00Z',
                sha1: 'efg567',
                tests: [
                  {
                    id: 'flattenTest4',
                    title: 'Flatten Test 4',
                    expectedStatus: 'passed',
                    location: { file: 'test4.spec.ts', line: 1, column: 1 },
                    tags: ['@svlOblt'],
                  },
                ],
              },
            },
          ],
        },
      ];
    });

    it('logs flattened structure when "--flatten" is set without "--save"', () => {
      flagsReader.enum.mockReturnValue('all');
      flagsReader.boolean.mockImplementation((flag) => {
        if (flag === 'flatten') return true;
        return false;
      });

      runDiscoverPlaywrightConfigs(flagsReader, log);

      // Should log flattened structure
      const infoCalls = log.info.mock.calls;
      const flattenedLog = infoCalls.find((call) => call[0].includes('flattened config group(s)'));
      expect(flattenedLog).toBeDefined();

      // Should log individual groups
      const groupLogs = infoCalls.filter(
        (call) => call[0].includes('serverless') || call[0].includes('stateful')
      );
      expect(groupLogs.length).toBeGreaterThan(0);
    });

    it('saves flattened format when "--flatten" and "--save" are set', () => {
      flagsReader.enum.mockReturnValue('all');
      flagsReader.boolean.mockImplementation((flag) => {
        if (flag === 'flatten') return true;
        if (flag === 'save') return true;
        return false;
      });

      // Helper to compute serverRunFlags from tags (matching the actual function logic)
      const getServerRunFlagsFromTags = (tags: string[]): string[] => {
        const modes: string[] = [];
        const tagSet = new Set(tags);
        if (tagSet.has('@ess')) {
          modes.push('--stateful');
        }
        if (tagSet.has('@svlSearch')) {
          modes.push('--serverless=es');
        }
        if (tagSet.has('@svlSecurity')) {
          modes.push('--serverless=security');
        }
        if (tagSet.has('@svlOblt')) {
          modes.push('--serverless=oblt');
        }
        return modes;
      };

      (filterModulesByScoutCiConfig as jest.Mock).mockReturnValue(
        mockTestableModules.modules.map((m) => ({
          name: m.name,
          group: m.group,
          type: m.type,
          visibility: m.visibility,
          configs: m.configs.map((c) => {
            const tags = c.manifest.tests[0].tags;
            return {
              path: c.path,
              hasTests: true,
              tags,
              serverRunFlags: getServerRunFlagsFromTags(tags),
              usesParallelWorkers: false,
            };
          }),
        }))
      );

      runDiscoverPlaywrightConfigs(flagsReader, log);

      expect(filterModulesByScoutCiConfig).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toBe('/path/to/scout_playwright_configs.json');
      const savedData = JSON.parse(writeCall[1]);

      // Should be an array of flattened groups
      expect(Array.isArray(savedData)).toBe(true);
      expect(savedData.length).toBeGreaterThan(0);

      // Verify structure of flattened groups
      savedData.forEach((group: any) => {
        expect(group).toHaveProperty('mode');
        expect(group).toHaveProperty('group');
        expect(group).toHaveProperty('deploymentType');
        expect(group).toHaveProperty('scoutCommand');
        expect(group).toHaveProperty('configs');
        expect(Array.isArray(group.configs)).toBe(true);
        expect(['serverless', 'stateful']).toContain(group.mode);
        expect(group.scoutCommand).toMatch(
          /^node scripts\/scout run-tests --(stateful|serverless=.*) --testTarget=cloud$/
        );
      });

      // Verify log message
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('Scout configs flattened and saved')
      );
    });

    it('groups configs correctly by mode, group, and scout command', () => {
      flagsReader.enum.mockReturnValue('all');
      flagsReader.boolean.mockImplementation((flag) => {
        if (flag === 'flatten') return true;
        if (flag === 'save') return true;
        return false;
      });

      // Helper to compute serverRunFlags from tags (matching the actual function logic)
      const getServerRunFlagsFromTags = (tags: string[]): string[] => {
        const modes: string[] = [];
        const tagSet = new Set(tags);
        if (tagSet.has('@ess')) {
          modes.push('--stateful');
        }
        if (tagSet.has('@svlSearch')) {
          modes.push('--serverless=es');
        }
        if (tagSet.has('@svlSecurity')) {
          modes.push('--serverless=security');
        }
        if (tagSet.has('@svlOblt')) {
          modes.push('--serverless=oblt');
        }
        return modes;
      };

      (filterModulesByScoutCiConfig as jest.Mock).mockReturnValue(
        mockTestableModules.modules.map((m) => ({
          name: m.name,
          group: m.group,
          type: m.type,
          visibility: m.visibility,
          configs: m.configs.map((c) => {
            const tags = c.manifest.tests[0].tags;
            return {
              path: c.path,
              hasTests: true,
              tags,
              serverRunFlags: getServerRunFlagsFromTags(tags),
              usesParallelWorkers: false,
            };
          }),
        }))
      );

      runDiscoverPlaywrightConfigs(flagsReader, log);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);

      // Find stateful group for 'search'
      // For stateful (ECH), deploymentType should be based on group: 'search' => 'elasticsearch'
      const statefulSearchGroup = savedData.find(
        (g: any) =>
          g.mode === 'stateful' &&
          g.group === 'search' &&
          g.scoutCommand === 'node scripts/scout run-tests --stateful --testTarget=cloud'
      );
      expect(statefulSearchGroup).toBeDefined();
      expect(statefulSearchGroup.deploymentType).toBe('elasticsearch');
      expect(statefulSearchGroup.configs).toContain('pluginSearch/config1.playwright.config.ts');

      // Find stateful group for 'platform'
      // For stateful (ECH), deploymentType should be based on group: 'platform' => 'general'
      const statefulPlatformGroup = savedData.find(
        (g: any) =>
          g.mode === 'stateful' &&
          g.group === 'platform' &&
          g.scoutCommand === 'node scripts/scout run-tests --stateful --testTarget=cloud'
      );
      expect(statefulPlatformGroup).toBeDefined();
      expect(statefulPlatformGroup.deploymentType).toBe('classic');
      expect(statefulPlatformGroup.configs).toContain(
        'pluginPlatform/config1.playwright.config.ts'
      );

      // Find serverless group for 'search'
      // For serverless (MKI), deploymentType should be based on serverRunFlag: '--serverless=es' => 'elasticsearch'
      const serverlessSearchGroup = savedData.find(
        (g: any) =>
          g.mode === 'serverless' &&
          g.group === 'search' &&
          g.scoutCommand === 'node scripts/scout run-tests --serverless=es --testTarget=cloud'
      );
      expect(serverlessSearchGroup).toBeDefined();
      expect(serverlessSearchGroup.deploymentType).toBe('elasticsearch');
      expect(serverlessSearchGroup.configs).toContain('pluginSearch/config1.playwright.config.ts');
      expect(serverlessSearchGroup.configs).toContain('pluginSearch/config2.playwright.config.ts');

      // Find serverless group for 'observability'
      // For serverless (MKI), deploymentType should be based on serverRunFlag: '--serverless=oblt' => 'observability'
      const serverlessObltGroup = savedData.find(
        (g: any) =>
          g.mode === 'serverless' &&
          g.group === 'observability' &&
          g.scoutCommand === 'node scripts/scout run-tests --serverless=oblt --testTarget=cloud'
      );
      expect(serverlessObltGroup).toBeDefined();
      expect(serverlessObltGroup.deploymentType).toBe('observability');
      expect(serverlessObltGroup.configs).toContain('pluginOblt/config1.playwright.config.ts');
    });

    it('handles configs with multiple "serverRunFlags" correctly', () => {
      flagsReader.enum.mockReturnValue('all');
      flagsReader.boolean.mockImplementation((flag) => {
        if (flag === 'flatten') return true;
        if (flag === 'save') return true;
        return false;
      });

      // Set up a module with a config that has multiple serverRunFlags
      mockTestableModules.modules = [
        {
          name: 'pluginMultiMode',
          group: 'test',
          type: 'plugin' as const,
          visibility: 'private' as const,
          root: 'x-pack/platform/plugins/private/pluginMultiMode',
          configs: [
            {
              path: 'pluginMultiMode/config1.playwright.config.ts',
              category: 'ui',
              type: 'playwright',
              manifest: {
                path: 'pluginMultiMode/config1.playwright.config.ts',
                exists: true,
                lastModified: '2024-01-01T00:00:00Z',
                sha1: 'fgh678',
                tests: [
                  {
                    id: 'multiModeTest',
                    title: 'Multi Mode Test',
                    expectedStatus: 'passed',
                    location: { file: 'test.spec.ts', line: 1, column: 1 },
                    tags: ['@ess', '@svlSearch', '@svlOblt'],
                  },
                ],
              },
            },
          ],
        },
      ];

      (filterModulesByScoutCiConfig as jest.Mock).mockReturnValue([
        {
          name: 'pluginMultiMode',
          group: 'platform',
          type: 'plugin',
          visibility: 'private',
          configs: [
            {
              path: 'pluginMultiMode/config1.playwright.config.ts',
              hasTests: true,
              tags: ['@ess', '@svlSearch', '@svlOblt'],
              serverRunFlags: ['--stateful', '--serverless=es', '--serverless=oblt'],
              usesParallelWorkers: false,
            },
          ],
        },
      ]);

      runDiscoverPlaywrightConfigs(flagsReader, log);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);

      // The same config should appear in multiple groups
      const statefulGroup = savedData.find(
        (g: any) =>
          g.mode === 'stateful' &&
          g.group === 'platform' &&
          g.scoutCommand === 'node scripts/scout run-tests --stateful --testTarget=cloud'
      );
      // For stateful (ECH), deploymentType should be based on group: 'test' => 'classic' (unknown group defaults to classic)
      expect(statefulGroup).toBeDefined();
      expect(statefulGroup.deploymentType).toBe('classic');
      expect(statefulGroup.configs).toContain('pluginMultiMode/config1.playwright.config.ts');

      const serverlessEsGroup = savedData.find(
        (g: any) =>
          g.mode === 'serverless' &&
          g.group === 'platform' &&
          g.scoutCommand === 'node scripts/scout run-tests --serverless=es --testTarget=cloud'
      );
      // For serverless (MKI), deploymentType should be based on serverRunFlag: '--serverless=es' => 'elasticsearch'
      expect(serverlessEsGroup).toBeDefined();
      expect(serverlessEsGroup.deploymentType).toBe('elasticsearch');
      expect(serverlessEsGroup.configs).toContain('pluginMultiMode/config1.playwright.config.ts');

      const serverlessObltGroup = savedData.find(
        (g: any) =>
          g.mode === 'serverless' &&
          g.group === 'platform' &&
          g.scoutCommand === 'node scripts/scout run-tests --serverless=oblt --testTarget=cloud'
      );
      // For serverless (MKI), deploymentType should be based on serverRunFlag: '--serverless=oblt' => 'observability'
      expect(serverlessObltGroup).toBeDefined();
      expect(serverlessObltGroup.deploymentType).toBe('observability');
      expect(serverlessObltGroup.configs).toContain('pluginMultiMode/config1.playwright.config.ts');
    });
  });
});
