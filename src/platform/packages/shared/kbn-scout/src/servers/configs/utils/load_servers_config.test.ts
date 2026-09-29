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

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { loadServersConfig } from '..';
import type { ScoutServerConfig, ScoutTestConfig } from '../../../types';
import { loadRawServerConfig } from '../loader';
import { Config } from '../config';
import { getConfigFilePath } from './get_config_file';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';
import { configureHTTP2 } from './configure_http2';
import { ScoutTestTarget } from '@kbn/scout-info';

vi.mock('./get_config_file', () => {
  const mocked = {
    getConfigFilePath: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../loader', () => {
  const mocked = {
    loadRawServerConfig: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../config', () => {
  const mocked = {
    Config: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./save_scout_test_config', () => {
  const mocked = {
    saveScoutTestConfigOnDisk: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./configure_http2', () => {
  const mocked = {
    configureHTTP2: vi.fn((config: ScoutServerConfig) => config),
  };
  return { ...mocked, default: mocked };
});

vi.mock('fs', () => {
  const actualFs = require('fs');
  return {
    ...actualFs,
    existsSync: vi.fn(),
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
  http2: false,
  uiam: true,
  projectType: 'oblt',
  productTier: 'complete',
  isCloud: true,
  license: 'trial',
  cloudUsersFilePath: '/path/to/users',
};

const mockRawConfig: ScoutServerConfig = {
  servers: {
    elasticsearch: { protocol: 'http', hostname: 'localhost', port: 9220 },
    kibana: { protocol: 'http', hostname: 'localhost', port: 5620 },
  },
  dockerServers: {},
  esTestCluster: { from: 'snapshot', files: [], serverArgs: [], ssl: false },
  kbnTestServer: { buildArgs: [], env: {}, sourceArgs: [], serverArgs: [] },
};

describe('loadServersConfig', () => {
  let mockLog: ToolingLog;

  const mockTestTarget = new ScoutTestTarget('cloud', 'serverless', 'observability_complete');
  const mockConfigPath = '/mock/config/path.ts';

  const mockConfigInstance = {
    getScoutTestConfig: vi.fn().mockReturnValue(mockScoutTestConfig),
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLog = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as ToolingLog;
    (fs.existsSync as Mock).mockReturnValue(true);
    (Config as unknown as Mock).mockReturnValue(mockConfigInstance);
  });

  it('should load, save, and return cluster configuration without HTTP/2 by default', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    (loadRawServerConfig as Mock).mockResolvedValue({ ...mockRawConfig });

    const result = await loadServersConfig(mockTestTarget, mockLog, configRootDir);

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockTestTarget);
    expect(loadRawServerConfig).toHaveBeenCalledWith(mockConfigPath);
    expect(configureHTTP2).not.toHaveBeenCalled();
    expect(Config).toHaveBeenCalled();
    expect(mockConfigInstance.getScoutTestConfig).toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).toHaveBeenCalledWith(mockScoutTestConfig, mockLog);
    expect(result).toBe(mockConfigInstance);
  });

  it('should apply HTTP/2 when http2 is explicitly true', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    (loadRawServerConfig as Mock).mockResolvedValue({ ...mockRawConfig, http2: true });

    await loadServersConfig(mockTestTarget, mockLog, configRootDir);

    expect(configureHTTP2).toHaveBeenCalled();
  });

  it('should skip HTTP/2 when http2 is explicitly false', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    (loadRawServerConfig as Mock).mockResolvedValue({ ...mockRawConfig, http2: false });

    await loadServersConfig(mockTestTarget, mockLog, configRootDir);

    expect(configureHTTP2).not.toHaveBeenCalled();
  });

  it('should throw an error if loadRawServerConfig fails', async () => {
    const configRootDir = '/mock/config/root/default/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    const errorMessage = 'Failed to read config file';
    (loadRawServerConfig as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(loadServersConfig(mockTestTarget, mockLog, configRootDir)).rejects.toThrow(
      errorMessage
    );

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockTestTarget);
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });

  it('should load custom config from custom directory', async () => {
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    (loadRawServerConfig as Mock).mockResolvedValue({ ...mockRawConfig });

    const result = await loadServersConfig(mockTestTarget, mockLog, configRootDir);

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockTestTarget);
    expect(loadRawServerConfig).toHaveBeenCalledWith(mockConfigPath);
    expect(result).toBe(mockConfigInstance);
  });

  it('should throw error when config file does not exist', async () => {
    const configRootDir = '/mock/config/root/custom/uiam_local/serverless';
    (getConfigFilePath as Mock).mockReturnValue(mockConfigPath);
    (fs.existsSync as Mock).mockReturnValue(false);

    await expect(loadServersConfig(mockTestTarget, mockLog, configRootDir)).rejects.toThrow(
      'Config file not found'
    );

    expect(getConfigFilePath).toHaveBeenCalledWith(configRootDir, mockTestTarget);
    expect(loadRawServerConfig).not.toHaveBeenCalled();
    expect(saveScoutTestConfigOnDisk).not.toHaveBeenCalled();
  });
});
