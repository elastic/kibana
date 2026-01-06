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
      stateful: true,
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      `Either '--config' or '--testFiles' flag is required`
    );
  });

  it(`should throw an error when both 'config' and 'testFiles' are provided`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      testFiles: 'test.spec.ts',
      stateful: true,
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      `Cannot use both '--config' or '--testFiles' flags at the same time`
    );
  });

  it(`should throw an error with '--stateful' flag as string value`, async () => {
    const flags = new FlagsReader({
      stateful: 'true',
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow('expected --stateful to be a boolean');
  });

  it(`should throw an error with '--serverless' flag as boolean`, async () => {
    const flags = new FlagsReader({
      serverless: true,
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow('expected --serverless to be a string');
  });

  it(`should throw an error with incorrect '--serverless' flag`, async () => {
    const flags = new FlagsReader({
      serverless: 'a',
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      'invalid --serverless, expected one of "es", "oblt", "oblt-logs-essentials", "security"'
    );
  });

  it(`should parse with serverless flag for local target`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      stateful: false,
      serverless: 'oblt',
      logToFile: false,
      headed: false,
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      mode: 'serverless=oblt',
      configPath: '/path/to/config',
      testTarget: 'local',
      headed: false,
      esFrom: undefined,
      installDir: undefined,
      logsDir: undefined,
    });
  });

  it(`should parse with stateful flag for local target`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      testTarget: 'local',
      stateful: true,
      logToFile: false,
      headed: true,
      esFrom: 'snapshot',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      mode: 'stateful',
      configPath: '/path/to/config',
      testTarget: 'local',
      headed: true,
      esFrom: 'snapshot',
      installDir: undefined,
      logsDir: undefined,
    });
  });

  it(`should throw an error with incorrect '--testTarget' flag`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      testTarget: 'a',
      stateful: true,
      logToFile: false,
      headed: true,
      esFrom: 'snapshot',
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      'invalid --testTarget, expected one of "local", "cloud"'
    );
  });

  it(`should parse with serverless flag for cloud target`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      testTarget: 'cloud',
      stateful: false,
      serverless: 'oblt',
      logToFile: false,
      headed: false,
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      mode: 'serverless=oblt',
      configPath: '/path/to/config',
      testTarget: 'cloud',
      headed: false,
      esFrom: undefined,
      installDir: undefined,
      logsDir: undefined,
    });
  });

  it(`should parse with stateful flag for cloud target`, async () => {
    const flags = new FlagsReader({
      config: '/path/to/config',
      testTarget: 'cloud',
      stateful: true,
      logToFile: false,
      headed: true,
      esFrom: 'snapshot',
    });
    validatePlaywrightConfigMock.mockResolvedValueOnce();
    const result = await parseTestFlags(flags);

    expect(result).toEqual({
      mode: 'stateful',
      configPath: '/path/to/config',
      testTarget: 'cloud',
      headed: true,
      esFrom: 'snapshot',
      installDir: undefined,
      logsDir: undefined,
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
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(validateAndProcessTestFilesMock).toHaveBeenCalledWith(testFile);
      expect(result).toEqual({
        mode: 'stateful',
        configPath: derivedConfig,
        testTarget: 'local',
        headed: false,
        testFiles: [testFile],
        esFrom: undefined,
        installDir: undefined,
        logsDir: undefined,
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
        testFiles: testFilesString,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(validateAndProcessTestFilesMock).toHaveBeenCalledWith(testFilesString);
      expect(result).toEqual({
        mode: 'stateful',
        configPath: derivedConfig,
        testTarget: 'local',
        headed: false,
        testFiles,
        esFrom: undefined,
        installDir: undefined,
        logsDir: undefined,
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
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
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
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
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
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      await expect(parseTestFlags(flags)).rejects.toThrow(errorMessage);
    });

    it('should not include testFiles in result when empty', async () => {
      const flags = new FlagsReader({
        config: '/path/to/config',
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result).not.toHaveProperty('testFiles');
      expect(result.configPath).toBe('/path/to/config');
    });
  });
});
