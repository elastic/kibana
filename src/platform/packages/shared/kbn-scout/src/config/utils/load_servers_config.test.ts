/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { loadServersConfig } from '..';
import type { CliSupportedServerModes, ScoutTestConfig } from '../../types';
import { readConfigFile } from '../loader';
import { getConfigFilePath } from './get_config_file';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';

jest.mock('./get_config_file', () => ({
  getConfigFilePath: jest.fn(),
}));

jest.mock('../loader', () => ({
  readConfigFile: jest.fn(),
}));

jest.mock('./save_scout_test_config', () => ({
  saveScoutTestConfigOnDisk: jest.fn(),
}));

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

const mockScoutTestConfig: ScoutTestConfig = {
  hosts: {
    kibana: 'http://localhost:5601',
    elasticsearch: 'http://localhost:9220',
  },
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
  serverless: true,
  projectType: 'oblt',
  isCloud: true,
  license: 'trial',
  cloudUsersFilePath: '/path/to/users',
};

describe('loadServersConfig', () => {
  let mockLog: ToolingLog;

  const mockMode = `serverless=${mockScoutTestConfig.projectType}` as CliSupportedServerModes;
  const mockConfigPath = '/mock/config/path.ts';

  const mockClusterConfig = {
    getScoutTestConfig: jest.fn().mockReturnValue(mockScoutTestConfig),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;
    // Default: custom config directory exists
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      // Mock custom directory exists
      if (path.includes('custom') && !path.includes('.')) {
        return true;
      }
      // Mock custom config file exists if it ends with .ts
      if (path.includes('custom') && path.endsWith('.ts')) {
        return true;
      }
      return false;
    });
  });

  it('should load, save, and return cluster configuration', async () => {
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog);

    expect(getConfigFilePath).toHaveBeenCalledWith(mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(mockClusterConfig.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockClusterConfig);

    // no errors should be logged
    expect(mockLog.info).not.toHaveBeenCalledWith(expect.stringContaining('error'));
  });

  it('should throw an error if readConfigFile fails', async () => {
    const errorMessage = 'Failed to read config file';
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockMode, mockLog)).rejects.toThrow(errorMessage);

    expect(getConfigFilePath).toHaveBeenCalledWith(mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should load custom config when customConfigPath is provided', async () => {
    const customConfigPath = 'security.serverless.uiam.config.ts';
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, customConfigPath);

    expect(getConfigFilePath).not.toHaveBeenCalled();
    expect(readConfigFile).toHaveBeenCalledWith(
      expect.stringMatching(/custom\/security\.serverless\.uiam\.config\.ts$/)
    );
    expect(mockClusterConfig.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockClusterConfig);
  });

  it('should load custom config when customConfigPath is provided without .ts extension', async () => {
    const customConfigPath = 'security.serverless.uiam.config';
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      // Return false for path without extension, true for path with .ts
      return path.endsWith('.ts');
    });
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, customConfigPath);

    expect(getConfigFilePath).not.toHaveBeenCalled();
    expect(readConfigFile).toHaveBeenCalledWith(
      expect.stringMatching(/custom\/security\.serverless\.uiam\.config\.ts$/)
    );
    expect(mockClusterConfig.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockClusterConfig);
  });

  it('should throw an error if custom config file fails to load', async () => {
    const customConfigPath = 'security.serverless.uiam.config.ts';
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const errorMessage = 'Failed to read custom config file';
    (readConfigFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockMode, mockLog, customConfigPath)).rejects.toThrow(
      errorMessage
    );

    expect(getConfigFilePath).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should throw an error if custom config file does not exist', async () => {
    const customConfigPath = 'nonexistent.config.ts';
    (fs.existsSync as jest.Mock).mockImplementation((checkPath: string) => {
      // Return true for the custom directory itself
      // The directory path will end with 'custom' (no file extension)
      // File paths will include the filename with extension
      const normalizedPath = checkPath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      // If the last part is just 'custom' (directory), return true
      if (lastPart === 'custom') {
        return true; // Directory exists
      }
      // Otherwise it's a file path, return false (file doesn't exist)
      return false;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(['other.config.ts', 'another.config.ts']);

    await expect(loadServersConfig(mockMode, mockLog, customConfigPath)).rejects.toThrow(
      'Custom config file not found'
    );

    expect(getConfigFilePath).not.toHaveBeenCalled();
    expect(readConfigFile).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should throw an error with available files list when custom config does not exist', async () => {
    const customConfigPath = 'nonexistent.config.ts';
    (fs.existsSync as jest.Mock).mockImplementation((checkPath: string) => {
      // Return true for the custom directory itself
      // The directory path will end with 'custom' (no file extension)
      // File paths will include the filename with extension
      const normalizedPath = checkPath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      // If the last part is just 'custom' (directory), return true
      if (lastPart === 'custom') {
        return true; // Directory exists
      }
      // Otherwise it's a file path, return false (file doesn't exist)
      return false;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue([
      'security.serverless.uiam.config.ts',
      'custom.stateful.config.ts',
    ]);

    let error: Error | undefined;
    try {
      await loadServersConfig(mockMode, mockLog, customConfigPath);
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error!.message).toContain('Custom config file not found');
    expect(error!.message).toContain('Available config files');
    expect(error!.message).toContain('security.serverless.uiam.config.ts');
    expect(error!.message).toContain('custom.stateful.config.ts');
  });

  it('should throw an error if custom config directory does not exist', async () => {
    const customConfigPath = 'some.config.ts';
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      // Return false for the custom directory itself
      if (path.includes('custom') && !path.includes('.')) {
        return false;
      }
      return false;
    });

    await expect(loadServersConfig(mockMode, mockLog, customConfigPath)).rejects.toThrow(
      'Custom config directory does not exist'
    );

    expect(getConfigFilePath).not.toHaveBeenCalled();
    expect(readConfigFile).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });
});
