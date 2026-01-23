/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Config } from '../config';
import { readConfigFile } from './read_config_file';

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

jest.mock('../config', () => ({
  Config: jest.fn(),
}));

describe('readConfigFile', () => {
  const configPath = '/mock/config/path';
  const resolvedPath = '/resolved/config/path';
  const mockPathResolve = path.resolve as jest.Mock;
  const mockConfigConstructor = Config as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it(`should load and return a valid 'Config' instance when the config file exports 'servers'`, async () => {
    const mockConfigModule = { servers: { host: 'localhost', port: 5601 } };

    mockPathResolve.mockReturnValueOnce(resolvedPath);

    jest.isolateModules(async () => {
      jest.mock(resolvedPath, () => mockConfigModule, { virtual: true });
      mockConfigConstructor.mockImplementation((servers) => ({ servers }));

      const result = await readConfigFile(configPath);

      expect(path.resolve).toHaveBeenCalledWith(configPath);
      expect(result).toEqual({ servers: mockConfigModule.servers });
    });
  });

  it(`should throw an error if the config file does not export 'servers'`, async () => {
    const mockConfigModule = { otherProperty: 'value' };

    mockPathResolve.mockReturnValueOnce(resolvedPath);

    jest.isolateModules(async () => {
      jest.mock(resolvedPath, () => mockConfigModule, { virtual: true });

      await expect(readConfigFile(configPath)).rejects.toThrow(
        `No 'servers' found in the config file at path: ${resolvedPath}`
      );
      expect(path.resolve).toHaveBeenCalledWith(configPath);
    });
  });

  it('should throw an error if the config file cannot be loaded', async () => {
    mockPathResolve.mockReturnValueOnce(resolvedPath);

    jest.isolateModules(async () => {
      const message = 'Module not found';
      jest.mock(
        resolvedPath,
        () => {
          throw new Error(message);
        },
        { virtual: true }
      );

      await expect(readConfigFile(configPath)).rejects.toThrow(
        `Failed to load config from ${configPath}: ${message}`
      );
      expect(path.resolve).toHaveBeenCalledWith(configPath);
    });
  });
});
