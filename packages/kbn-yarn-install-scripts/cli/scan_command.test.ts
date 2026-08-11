/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

import { scanCommand } from './scan_command';
import { loadConfig, scanInstallScripts } from '../src';
import type { InstallScriptsConfig, PackageWithInstallScript } from '../src/types';

jest.mock('../src', () => ({
  loadConfig: jest.fn(),
  scanInstallScripts: jest.fn(),
  MANAGED_LIFECYCLES: ['install', 'postinstall'],
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn((msg: string) => new Error(msg)),
}));

jest.mock('cli-table3', () => {
  return jest.fn().mockImplementation(() => ({
    push: jest.fn(),
    toString: jest.fn().mockReturnValue('mock table'),
  }));
});

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
const mockScanInstallScripts = scanInstallScripts as jest.MockedFunction<typeof scanInstallScripts>;
const mockCreateFailError = createFailError as jest.MockedFunction<typeof createFailError>;

const mockLog = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  write: jest.fn(),
} as unknown as jest.Mocked<ToolingLog>;

function createPackage(
  name: string,
  lifecycle: 'install' | 'postinstall'
): PackageWithInstallScript {
  const versions: Record<string, string> = {
    '@elastic/eui': '112.0.0',
    '@elastic/charts': '71.1.2',
  };
  return { name, version: versions[name] || '1.0.0', path: name, lifecycle, script: 'echo' };
}

describe('scanCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFailError.mockImplementation((msg: string) => {
      const err = new Error(msg) as Error & { exitCode: number; showHelp: boolean };
      err.exitCode = 1;
      err.showHelp = false;
      return err as ReturnType<typeof createFailError>;
    });
  });

  it('should log success when no packages have install scripts', () => {
    mockScanInstallScripts.mockReturnValue([]);
    scanCommand(mockLog, false);
    expect(mockLog.success).toHaveBeenCalledWith('No packages with install scripts found.');
    expect(mockLoadConfig).not.toHaveBeenCalled();
  });

  it('should display status counts from config', () => {
    const packages = [
      createPackage('@elastic/eui', 'postinstall'),
      createPackage('@elastic/charts', 'postinstall'),
    ];

    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        { path: '@elastic/charts', lifecycle: 'postinstall', required: false, reason: 'Optional' },
      ],
    };

    mockScanInstallScripts.mockReturnValue(packages);
    mockLoadConfig.mockReturnValue(config);
    scanCommand(mockLog, false);

    expect(mockLog.success).toHaveBeenCalledWith(
      'Found 2 install scripts: 1 required, 1 skipped, 0 unconfigured'
    );
  });

  it('should warn about unconfigured packages', () => {
    mockScanInstallScripts.mockReturnValue([createPackage('@elastic/eui', 'postinstall')]);
    mockLoadConfig.mockReturnValue({ packages: [] });
    scanCommand(mockLog, false);

    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('unconfigured install script(s) found')
    );
  });

  it('should throw in validate mode when unconfigured packages exist', () => {
    mockScanInstallScripts.mockReturnValue([createPackage('@elastic/eui', 'postinstall')]);
    mockLoadConfig.mockReturnValue({ packages: [] });

    expect(() => scanCommand(mockLog, true)).toThrow('unconfigured install script(s) found');
  });

  it('should not throw in validate mode when all packages are configured', () => {
    mockScanInstallScripts.mockReturnValue([createPackage('@elastic/eui', 'postinstall')]);
    mockLoadConfig.mockReturnValue({
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    });

    expect(() => scanCommand(mockLog, true)).not.toThrow();
  });

  it('should propagate errors from scanInstallScripts', () => {
    mockScanInstallScripts.mockImplementation(() => {
      throw new Error('Scan failed');
    });
    expect(() => scanCommand(mockLog, false)).toThrow('Scan failed');
  });

  it('should propagate errors from loadConfig', () => {
    mockScanInstallScripts.mockReturnValue([createPackage('@elastic/eui', 'postinstall')]);
    mockLoadConfig.mockImplementation(() => {
      throw new Error('Config failed');
    });

    expect(() => scanCommand(mockLog, false)).toThrow('Config failed');
  });
});
