/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseTestFlags } from './flags';
import { FlagsReader } from '@kbn/dev-cli-runner';
import * as configValidator from './config_validator';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const validatePlaywrightConfigMock = jest.spyOn(configValidator, 'validatePlaywrightConfig');

describe('parseTestFlags', () => {
  it(`should throw an error without 'config' flag`, async () => {
    const flags = new FlagsReader({
      stateful: true,
      logToFile: false,
      headed: false,
    });

    await expect(parseTestFlags(flags)).rejects.toThrow(
      'Path to playwright config is required: --config <file path>'
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
      'invalid --serverless, expected one of "es", "oblt", "security"'
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
    let existsSyncSpy: jest.SpyInstance;
    let statSyncSpy: jest.SpyInstance;

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      validatePlaywrightConfigMock.mockResolvedValue();

      // Spy on fs methods
      existsSyncSpy = jest.spyOn(fs, 'existsSync');
      statSyncSpy = jest.spyOn(fs, 'statSync');
    });

    afterEach(() => {
      // Restore fs methods
      existsSyncSpy.mockRestore();
      statSyncSpy.mockRestore();
    });

    it('should parse without testFiles flag (optional)', async () => {
      const flags = new FlagsReader({
        config: '/path/to/config',
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result).toEqual({
        mode: 'stateful',
        configPath: '/path/to/config',
        testTarget: 'local',
        headed: false,
        esFrom: undefined,
        installDir: undefined,
        logsDir: undefined,
      });
      expect(result).not.toHaveProperty('testFiles');
    });

    it('should parse with single test file', async () => {
      const testFile = 'src/test.spec.ts';
      const fullPath = path.resolve(REPO_ROOT, testFile);

      existsSyncSpy.mockReturnValue(true);
      statSyncSpy.mockReturnValue({ isFile: () => true } as any);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result).toEqual({
        mode: 'stateful',
        configPath: '/path/to/config',
        testTarget: 'local',
        headed: false,
        testFiles: [testFile],
        esFrom: undefined,
        installDir: undefined,
        logsDir: undefined,
      });
      expect(existsSyncSpy).toHaveBeenCalledWith(fullPath);
      expect(statSyncSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should parse with multiple test files', async () => {
      const testFiles = ['src/test1.spec.ts', 'src/test2.spec.ts', 'src/test3.spec.ts'];
      const testFilesString = testFiles.join(',');

      existsSyncSpy.mockReturnValue(true);
      statSyncSpy.mockReturnValue({ isFile: () => true } as any);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFilesString,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result).toEqual({
        mode: 'stateful',
        configPath: '/path/to/config',
        testTarget: 'local',
        headed: false,
        testFiles,
        esFrom: undefined,
        installDir: undefined,
        logsDir: undefined,
      });
      expect(existsSyncSpy).toHaveBeenCalledTimes(3);
      expect(statSyncSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle test files with spaces around commas', async () => {
      const testFiles = ['src/test1.spec.ts', 'src/test2.spec.ts'];
      const testFilesString = ' src/test1.spec.ts , src/test2.spec.ts ';

      existsSyncSpy.mockReturnValue(true);
      statSyncSpy.mockReturnValue({ isFile: () => true } as any);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFilesString,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result.testFiles).toEqual(testFiles);
    });

    it('should filter out empty strings from comma-separated list', async () => {
      const testFile = 'src/test.spec.ts';
      const testFilesString = 'src/test.spec.ts,,, ,';

      existsSyncSpy.mockReturnValue(true);
      statSyncSpy.mockReturnValue({ isFile: () => true } as any);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFilesString,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result.testFiles).toEqual([testFile]);
    });

    it('should throw error when test file does not exist', async () => {
      const testFile = 'src/nonexistent.spec.ts';

      existsSyncSpy.mockReturnValue(false);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      await expect(parseTestFlags(flags)).rejects.toThrow(`Test file does not exist: ${testFile}`);
    });

    it('should throw error when test file path is outside repository', async () => {
      const testFile = '../outside/test.spec.ts';

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      await expect(parseTestFlags(flags)).rejects.toThrow(
        `Test file must be within the repository: ${testFile}`
      );
    });

    it('should throw error when test file path is a directory', async () => {
      const testFile = 'src/directory';

      existsSyncSpy.mockReturnValue(true);
      statSyncSpy.mockReturnValue({ isFile: () => false } as any);

      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: testFile,
        stateful: true,
        logToFile: false,
        headed: false,
      });

      await expect(parseTestFlags(flags)).rejects.toThrow(
        `Test file must be a file, not a directory: ${testFile}`
      );
    });

    it('should handle empty testFiles string', async () => {
      const flags = new FlagsReader({
        config: '/path/to/config',
        testFiles: '',
        stateful: true,
        logToFile: false,
        headed: false,
      });

      const result = await parseTestFlags(flags);

      expect(result).not.toHaveProperty('testFiles');
    });
  });
});
