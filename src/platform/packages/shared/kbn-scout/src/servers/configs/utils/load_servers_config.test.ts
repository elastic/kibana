/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { getConfigFilePath } from './get_config_file';
import { readConfigFile } from '../loader';
import { loadServersConfig } from '..';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';
import { getConfigRootDir } from './detect_custom_config';
import type { CliSupportedServerModes, ScoutTestConfig } from '../../../types';

jest.mock('./get_config_file', () => ({
  getConfigFilePath: jest.fn(),
}));

jest.mock('../loader', () => ({
  readConfigFile: jest.fn(),
}));

jest.mock('./save_scout_test_config', () => ({
  saveScoutTestConfigOnDisk: jest.fn(),
}));

jest.mock('./detect_custom_config', () => ({
  getConfigRootDir: jest.fn(),
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
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, defaultPlaywrightPath);

    expect(getConfigRootDir).toHaveBeenCalledWith(defaultPlaywrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(mockClusterConfig.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockClusterConfig);
  });

  it('should throw an error if readConfigFile fails', async () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    const errorMessage = 'Failed to read config file';
    (readConfigFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockMode, mockLog, defaultPlaywrightPath)).rejects.toThrow(
      errorMessage
    );

    expect(getConfigRootDir).toHaveBeenCalledWith(defaultPlaywrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it(`should use default server config when playwright config is in scout directory`, async () => {
    const playwrightPath = 'x-pack/solutions/security/test/scout/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, playwrightPath);

    expect(getConfigRootDir).toHaveBeenCalledWith(playwrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(result).toBe(mockClusterConfig);
  });

  it('should auto-detect and load custom config when scout_ pattern is found', async () => {
    const playwrightPath =
      'x-pack/solutions/security/test/scout_uiam_local/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (readConfigFile as jest.Mock).mockResolvedValue(mockClusterConfig);

    const result = await loadServersConfig(mockMode, mockLog, playwrightPath);

    expect(getConfigRootDir).toHaveBeenCalledWith(playwrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).toHaveBeenCalledWith(mockConfigPath);
    expect(result).toBe(mockClusterConfig);
  });

  it('should throw error when config file does not exist', async () => {
    const playwrightPath =
      'x-pack/solutions/security/test/scout_uiam_local/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await expect(loadServersConfig(mockMode, mockLog, playwrightPath)).rejects.toThrow(
      'Config file not found'
    );

    expect(getConfigRootDir).toHaveBeenCalledWith(playwrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(readConfigFile).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should throw error if config file fails to load', async () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigRootDir as jest.Mock).mockReturnValue(configRootDir);
    (getConfigFilePath as jest.Mock).mockReturnValue(mockConfigPath);
    const errorMessage = 'Failed to read config file';
    (readConfigFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockMode, mockLog, defaultPlaywrightPath)).rejects.toThrow(
      errorMessage
    );

    expect(getConfigRootDir).toHaveBeenCalledWith(defaultPlaywrightPath, mockMode);
    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockMode);
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });
});
