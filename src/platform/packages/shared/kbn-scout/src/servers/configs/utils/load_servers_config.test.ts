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
import type { CliSupportedServerModes, ScoutTestConfig } from '../../../types';
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
  uiam: false,
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
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should load, save, and return cluster configuration', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, configRootDir);

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(mockClusterConfig.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockClusterConfig);
  });

  it('should throw an error if readConfigFile fails', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    const errorMessage = 'Failed to read config file';
    (readConfigFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockMode, mockLog, configRootDir)).rejects.toThrow(errorMessage);

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should load custom config from custom directory', async () => {
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, configRootDir);

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(result).toBe(mockClusterConfig);
  });

  it('should throw error when config file does not exist', async () => {
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await expect(loadServersConfig(mockMode, mockLog, configRootDir)).rejects.toThrow(
      'Config file not found'
    );

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });
});
