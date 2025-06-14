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
});
