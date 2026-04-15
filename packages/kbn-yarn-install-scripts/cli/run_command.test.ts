/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import { runCommand } from './run_command';
import { loadConfig, runInstallScripts } from '../src';
import type { InstallScriptsConfig } from '../src/types';

jest.mock('../src', () => ({
  loadConfig: jest.fn(),
  runInstallScripts: jest.fn(),
}));

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
const mockRunInstallScripts = runInstallScripts as jest.MockedFunction<typeof runInstallScripts>;

const mockLog = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  write: jest.fn(),
} as unknown as jest.Mocked<ToolingLog>;

describe('runCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load config and run install scripts', () => {
    const mockConfig: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    mockLoadConfig.mockReturnValue(mockConfig);
    runCommand(mockLog, false, false);
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockRunInstallScripts).toHaveBeenCalledWith({
      config: mockConfig,
      log: mockLog,
      verbose: false,
      dryRun: false,
    });
    expect(mockLog.success).toHaveBeenCalledWith('Install scripts complete');
  });

  it('should pass verbose=true to runInstallScripts', () => {
    mockLoadConfig.mockReturnValue({ packages: [] });
    runCommand(mockLog, true, false);
    expect(mockRunInstallScripts).toHaveBeenCalledWith(expect.objectContaining({ verbose: true }));
  });

  it('should pass dryRun=true to runInstallScripts', () => {
    mockLoadConfig.mockReturnValue({ packages: [] });
    runCommand(mockLog, false, true);
    expect(mockRunInstallScripts).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  });

  it('should propagate errors from loadConfig', () => {
    mockLoadConfig.mockImplementation(() => {
      throw new Error('Config not found');
    });

    expect(() => runCommand(mockLog, false, false)).toThrow('Config not found');
    expect(mockRunInstallScripts).not.toHaveBeenCalled();
  });

  it('should propagate errors from runInstallScripts', () => {
    mockLoadConfig.mockReturnValue({ packages: [] });
    mockRunInstallScripts.mockImplementation(() => {
      throw new Error('Script failed');
    });

    expect(() => runCommand(mockLog, false, false)).toThrow('Script failed');
    expect(mockLog.success).not.toHaveBeenCalled();
  });
});
