/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import Fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';
import type { ServerlessProjectType } from '@kbn/es';

const MOCKED_SCOUT_SERVERS_ROOT = '/mock/repo/root/scout/servers';

jest.mock('fs');

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('@kbn/scout-info', () => ({
  SCOUT_SERVERS_ROOT: '/mock/repo/root/scout/servers',
}));

const testServersConfig = {
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
  projectType: 'oblt' as ServerlessProjectType,
  isCloud: true,
  license: 'trial',
  cloudUsersFilePath: '/path/to/users',
};

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
}));

describe('saveScoutTestConfigOnDisk', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;
  });

  it('should save configuration to disk successfully', () => {
    const mockConfigFilePath = `${MOCKED_SCOUT_SERVERS_ROOT}/local.json`;

    // Mock path.join to return a fixed file path
    (path.join as jest.Mock).mockReturnValueOnce(mockConfigFilePath);

    // Mock Fs.existsSync to return true
    (Fs.existsSync as jest.Mock).mockReturnValueOnce(true);

    // Mock Fs.writeFileSync to do nothing
    const writeFileSyncMock = jest.spyOn(Fs, 'writeFileSync');

    saveScoutTestConfigOnDisk(testServersConfig, mockLog);

    expect(Fs.existsSync).toHaveBeenCalledWith(MOCKED_SCOUT_SERVERS_ROOT);
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      mockConfigFilePath,
      JSON.stringify(testServersConfig, null, 2),
      'utf-8'
    );
    expect(mockLog.info).toHaveBeenCalledWith(
      `scout: Test server configuration saved at ${mockConfigFilePath}`
    );
  });

  it('should throw an error if writing to file fails', () => {
    const mockConfigFilePath = `${MOCKED_SCOUT_SERVERS_ROOT}/local.json`;

    (path.join as jest.Mock).mockReturnValueOnce(mockConfigFilePath);
    (Fs.existsSync as jest.Mock).mockReturnValueOnce(true);

    // Mock writeFileSync to throw an error
    (Fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Disk is full');
    });

    expect(() => saveScoutTestConfigOnDisk(testServersConfig, mockLog)).toThrow(
      `Failed to save test server configuration at ${mockConfigFilePath}`
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      `scout: Failed to save test server configuration - Disk is full`
    );
  });

  it('should create configuration directory if it does not exist', () => {
    const mockConfigFilePath = `${MOCKED_SCOUT_SERVERS_ROOT}/local.json`;

    (path.join as jest.Mock).mockReturnValueOnce(mockConfigFilePath);

    // Mock existsSync to simulate non-existent directory
    (Fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    const mkdirSyncMock = jest.spyOn(Fs, 'mkdirSync');
    const writeFileSyncMock = jest.spyOn(Fs, 'writeFileSync');

    saveScoutTestConfigOnDisk(testServersConfig, mockLog);

    expect(Fs.existsSync).toHaveBeenCalledWith(MOCKED_SCOUT_SERVERS_ROOT);
    expect(mkdirSyncMock).toHaveBeenCalledWith(MOCKED_SCOUT_SERVERS_ROOT, { recursive: true });
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      mockConfigFilePath,
      JSON.stringify(testServersConfig, null, 2),
      'utf-8'
    );
    expect(mockLog.debug).toHaveBeenCalledWith(
      `scout: creating configuration directory: ${MOCKED_SCOUT_SERVERS_ROOT}`
    );
    expect(mockLog.info).toHaveBeenCalledWith(
      `scout: Test server configuration saved at ${mockConfigFilePath}`
    );
  });
});
