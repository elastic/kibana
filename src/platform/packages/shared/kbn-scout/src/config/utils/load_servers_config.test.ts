/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getConfigFilePath } from './get_config_file';
import { readConfigFile } from '../loader';
import { loadServersConfig } from '..';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';
import { CliSupportedServerModes, ScoutTestConfig } from '../../types';

jest.mock('./get_config_file', () => ({
  getConfigFilePath: jest.fn(),
}));

jest.mock('../loader', () => ({
  readConfigFile: jest.fn(),
}));

jest.mock('./save_scout_test_config', () => ({
  saveScoutTestConfigOnDisk: jest.fn(),
}));

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
});
