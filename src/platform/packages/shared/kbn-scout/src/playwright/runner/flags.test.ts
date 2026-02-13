/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import * as testFilesUtils from '../../common/utils';
import * as configValidator from './config_validator';
import { parseTestFlags } from './flags';

const validatePlaywrightConfigMock = jest.spyOn(configValidator, 'validatePlaywrightConfig');

// Mock the entire module to avoid spy redefinition issues
jest.mock('../../common/utils', () => ({
  ...jest.requireActual('../../common/utils'),
  validateAndProcessTestFiles: jest.fn(),
}));

const validateAndProcessTestFilesMock =
  testFilesUtils.validateAndProcessTestFiles as jest.MockedFunction<
    typeof testFilesUtils.validateAndProcessTestFiles
  >;

describe('parseTestFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validatePlaywrightConfigMock.mockResolvedValue();
  });

  it(`should throw an error without 'config' or 'testFiles' flag`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'stateful',
      domain: 'classic',
      headed: false,
      logToFile: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      `Either '--config' or '--testFiles' flag is required`
    );
  });

  it(`should throw an error when both 'config' and 'testFiles' are provided`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      config: '/path/to/config',
      testFiles: 'test.spec.ts',
      arch: 'stateful',
      domain: 'classic',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      `Cannot use both '--config' or '--testFiles' flags at the same time`
    );
  });

  it(`should throw an error with '--arch' flag as boolean`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: true,
      domain: 'classic',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow('expected --arch to be a string');
  });

  it(`should throw an error with '--domain' flag as boolean`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'stateful',
      domain: true,
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow('expected --domain to be a string');
  });

  it(`should throw an error with incorrect '--location' flag`, async () => {
    const flags = new FlagsReader({
      location: 'earth',
      arch: 'stateful',
      domain: 'classic',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      /Scout test target validation discovered 1 issue\(s\):\n - location/
    );
  });

  it(`should throw an error with incorrect '--arch' flag`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'bad_arch',
      domain: 'classic',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      /Scout test target validation discovered 1 issue\(s\):\n - arch/
    );
  });

  it(`should throw an error with incorrect '--domain' flag`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'stateful',
      domain: 'rainbow-barfing-unicorns',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      /Scout test target validation discovered 1 issue\(s\):\n - domain/
    );
  });

  it(`should parse with serverless arch for local target`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'serverless',
      domain: 'observability_complete',
      config: '/path/to/config',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      configPath: '/path/to/config',
      esFrom: undefined,
      headed: false,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'serverless',
        domain: 'observability_complete',
        location: 'local',
      },
    });
  });

  it(`should parse with stateful arch for local target`, async () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'stateful',
      domain: 'classic',
      config: '/path/to/config',
      logToFile: false,
      headed: true,
      esFrom: 'snapshot',
      serverConfigSet: 'default',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      configPath: '/path/to/config',
      esFrom: 'snapshot',
      headed: true,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'stateful',
        domain: 'classic',
        location: 'local',
      },
    });
  });

  it(`should parse with serverless arch for cloud target`, async () => {
    const flags = new FlagsReader({
      location: 'cloud',
      arch: 'serverless',
      domain: 'security_ease',
      config: '/path/to/config',
      logToFile: false,
      headed: false,
      serverConfigSet: 'default',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      configPath: '/path/to/config',
      esFrom: undefined,
      headed: false,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'serverless',
        domain: 'security_ease',
        location: 'cloud',
      },
    });
  });

  it(`should parse with stateful flag for cloud target`, async () => {
    const flags = new FlagsReader({
      location: 'cloud',
      arch: 'stateful',
      domain: 'classic',
      config: '/path/to/config',
      logToFile: false,
      headed: true,
      esFrom: 'snapshot',
      serverConfigSet: 'default',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      configPath: '/path/to/config',
      esFrom: 'snapshot',
      headed: true,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'stateful',
        domain: 'classic',
        location: 'cloud',
      },
    });
  });

  describe('testFiles flag', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      validatePlaywrightConfigMock.mockResolvedValue();
    });

    it('should use validateAndProcessTestFiles helper and derive config path', async () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test.spec.ts';
      const derivedConfig =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/playwright.config.ts';

      validateAndProcessTestFilesMock.mockReturnValue({
        testFiles: [testFile],
        configPath: derivedConfig,
      });

      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        testFiles: testFile,
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      const result = await parseTestFlags(flags);

      expect(validateAndProcessTestFilesMock).toHaveBeenCalledWith(testFile);
      expect(result).toEqual({
        configPath: derivedConfig,
        esFrom: undefined,
        headed: false,
        installDir: undefined,
        logsDir: undefined,
        serverConfigSet: 'default',
        testFiles: [testFile],
        testTarget: {
          arch: 'stateful',
          domain: 'classic',
          location: 'local',
        },
      });
    });

    it('should handle multiple test files through helper', async () => {
      const testFiles = [
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test1.spec.ts',
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test2.spec.ts',
      ];
      const testFilesString = testFiles.join(',');
      const derivedConfig =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/playwright.config.ts';

      validateAndProcessTestFilesMock.mockReturnValue({
        testFiles,
        configPath: derivedConfig,
      });

      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        testFiles: testFilesString,
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      const result = await parseTestFlags(flags);

      expect(validateAndProcessTestFilesMock).toHaveBeenCalledWith(testFilesString);
      expect(result).toEqual({
        configPath: derivedConfig,
        esFrom: undefined,
        headed: false,
        installDir: undefined,
        logsDir: undefined,
        serverConfigSet: 'default',
        testFiles,
        testTarget: {
          arch: 'stateful',
          domain: 'classic',
          location: 'local',
        },
      });
    });

    it('should handle API tests with correct config derivation', async () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/api/tests/test.spec.ts';
      const derivedConfig =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/api/playwright.config.ts';

      validateAndProcessTestFilesMock.mockReturnValue({
        testFiles: [testFile],
        configPath: derivedConfig,
      });

      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        testFiles: testFile,
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      const result = await parseTestFlags(flags);

      expect(result.configPath).toBe(derivedConfig);
      expect(result.testFiles).toEqual([testFile]);
    });

    it('should handle parallel tests with correct config derivation', async () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/parallel_tests/test.spec.ts';
      const derivedConfig =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/parallel.playwright.config.ts';

      validateAndProcessTestFilesMock.mockReturnValue({
        testFiles: [testFile],
        configPath: derivedConfig,
      });

      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        testFiles: testFile,
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      const result = await parseTestFlags(flags);

      expect(result.configPath).toBe(derivedConfig);
      expect(result.testFiles).toEqual([testFile]);
    });

    it('should propagate validation errors from helper', async () => {
      const testFile = 'invalid/path/test.spec.ts';
      const errorMessage = 'Test file must be from scout directory';

      validateAndProcessTestFilesMock.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        testFiles: testFile,
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      await expect(parseTestFlags(flags)).rejects.toThrow(errorMessage);
    });

    it('should not include testFiles in result when empty', async () => {
      const flags = new FlagsReader({
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
        config: '/path/to/config',
        logToFile: false,
        headed: false,
        serverConfigSet: 'default',
      });

      const result = await parseTestFlags(flags);

      expect(result).not.toHaveProperty('testFiles');
      expect(result.configPath).toBe('/path/to/config');
    });
  });
});
