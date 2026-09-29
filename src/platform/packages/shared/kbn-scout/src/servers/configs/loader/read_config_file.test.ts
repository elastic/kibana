/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import path from 'path';
import { Config } from '../config';
import { readConfigFile } from './read_config_file';

vi.mock('path', () => {
  const mocked = {
    resolve: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../config', () => {
  const mocked = {
    Config: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('readConfigFile', () => {
  const configPath = '/mock/config/path';
  const resolvedPath = '/resolved/config/path';
  const mockPathResolve = path.resolve as Mock;
  const mockConfigConstructor = Config as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it(`should load and return a valid 'Config' instance when the config file exports 'servers'`, async () => {
    const mockConfigModule = { servers: { host: 'localhost', port: 5601 } };

    mockPathResolve.mockReturnValueOnce(resolvedPath);

    jest.isolateModules(async () => {
      vi.doMock(resolvedPath, () => mockConfigModule, { virtual: true });
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
      vi.doMock(resolvedPath, () => mockConfigModule, { virtual: true });

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
      vi.doMock(
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
