/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validatePlaywrightConfig } from './config_validator';
import * as configLoader from './config_loader';
import Fs from 'fs';
import { VALID_CONFIG_MARKER } from '../types';

jest.mock('fs');

const existsSyncMock = jest.spyOn(Fs, 'existsSync');
const loadConfigModuleMock = jest.spyOn(configLoader, 'loadConfigModule');

describe('validatePlaywrightConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation for a valid config file', async () => {
    const configPath = 'valid/path/config.ts';
    existsSyncMock.mockReturnValue(true);
    loadConfigModuleMock.mockResolvedValue({
      default: {
        use: { [VALID_CONFIG_MARKER]: true },
        testDir: './tests',
      },
    });

    await expect(validatePlaywrightConfig(configPath)).resolves.not.toThrow();
  });

  it('should throw an error if the config file does not have the valid marker', async () => {
    const configPath = 'valid/path/config.ts';
    existsSyncMock.mockReturnValue(true);
    loadConfigModuleMock.mockResolvedValue({
      default: {
        use: {},
        testDir: './tests',
      },
    });

    await expect(validatePlaywrightConfig(configPath)).rejects.toThrow(
      `The config file at "${configPath}" must be created with "createPlaywrightConfig" from '@kbn/scout' package:`
    );
  });

  it(`should throw an error if the config file does not have a 'testDir'`, async () => {
    const configPath = 'valid/path/config.ts';
    existsSyncMock.mockReturnValue(true);
    loadConfigModuleMock.mockResolvedValue({
      default: {
        use: { [VALID_CONFIG_MARKER]: true },
      },
    });

    await expect(validatePlaywrightConfig(configPath)).rejects.toThrow(
      `The config file at "${configPath}" must export a valid Playwright configuration with "testDir" property.`
    );
  });

  it('should throw an error if the config file does not have a default export', async () => {
    const configPath = 'valid/path/config.ts';
    existsSyncMock.mockReturnValue(true);
    loadConfigModuleMock.mockResolvedValue({
      test: {
        use: {},
        testDir: './tests',
      },
    });

    await expect(validatePlaywrightConfig(configPath)).rejects.toThrow(
      `The config file at "${configPath}" must export default function`
    );
  });

  it('should throw an error if the path does not exist', async () => {
    const configPath = 'invalid/path/to/config.ts';
    existsSyncMock.mockReturnValue(false);

    await expect(validatePlaywrightConfig(configPath)).rejects.toThrow(
      `Path to a valid TypeScript config file is required: --config <relative path to .ts file>`
    );
  });

  it('should throw an error if the file does not have a .ts extension', async () => {
    const configPath = 'config.js';
    existsSyncMock.mockReturnValue(true);

    await expect(validatePlaywrightConfig(configPath)).rejects.toThrow(
      `Path to a valid TypeScript config file is required: --config <relative path to .ts file>`
    );
  });
});
