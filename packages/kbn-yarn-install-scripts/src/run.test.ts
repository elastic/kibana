/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';

import type { ToolingLog } from '@kbn/tooling-log';

import { runInstallScripts } from './run';
import type { InstallScriptsConfig } from './types';

jest.mock('fs');
jest.mock('child_process');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/mock/kibana' }));
jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn((msg: string) => new Error(msg)),
}));

const mockFs = Fs as jest.Mocked<typeof Fs>;
const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

const mockLog = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  write: jest.fn(),
} as unknown as jest.Mocked<ToolingLog>;

const mockSpawnResult = {
  status: 0,
  signal: null,
  output: [],
  pid: 1,
  stdout: Buffer.from(''),
  stderr: Buffer.from(''),
};

describe('runInstallScripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return early when no packages are configured to run', () => {
    runInstallScripts({ config: { packages: [] }, log: mockLog });
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('should skip packages with required: false', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: false, reason: 'Not needed' },
      ],
    };
    runInstallScripts({ config, log: mockLog });
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('should run script for packages with required: true', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    const packageJson = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'echo' },
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockSpawnSync.mockReturnValue(mockSpawnResult);

    runInstallScripts({ config, log: mockLog });

    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
    const callArgs = mockSpawnSync.mock.calls[0];
    expect(callArgs[0]).toBe('echo');
    const options = callArgs[1] as unknown as {
      cwd: string;
      shell: boolean;
      env: Record<string, string>;
    };
    expect(options.cwd).toBe('/mock/kibana/node_modules/@elastic/eui');
    expect(options.shell).toBe(true);
    expect(options.env.npm_lifecycle_event).toBe('postinstall');
    expect(options.env.npm_package_name).toBe('@elastic/eui');
  });

  it('should use stdio inherit when verbose is true, pipe when false', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    const packageJson = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'echo' },
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockSpawnSync.mockReturnValue(mockSpawnResult);

    runInstallScripts({ config, log: mockLog, verbose: true });
    const verboseOptions = mockSpawnSync.mock.calls[0][1] as unknown as { stdio: string };
    expect(verboseOptions.stdio).toBe('inherit');

    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockSpawnSync.mockReturnValue(mockSpawnResult);

    runInstallScripts({ config, log: mockLog, verbose: false });
    const quietOptions = mockSpawnSync.mock.calls[0][1] as unknown as { stdio: string };
    expect(quietOptions.stdio).toBe('pipe');
  });

  it('should throw when package.json does not exist', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    mockFs.existsSync.mockReturnValue(false);

    expect(() => runInstallScripts({ config, log: mockLog })).toThrow('Package not found');
  });

  it('should throw when lifecycle script does not exist in package.json', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: '@elastic/eui', scripts: {} }));

    expect(() => runInstallScripts({ config, log: mockLog })).toThrow(
      'No postinstall script found'
    );
  });

  it('should throw when script exits with non-zero status', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    const packageJson = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'exit 1' },
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockSpawnSync.mockReturnValue({ ...mockSpawnResult, status: 1 });

    expect(() => runInstallScripts({ config, log: mockLog })).toThrow('failed');
  });

  it('should run install scripts before postinstall scripts', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        { path: '@elastic/charts', lifecycle: 'install', required: true, reason: 'Required' },
        { path: '@elastic/datemath', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(
        JSON.stringify({
          name: '@elastic/charts',
          version: '71.1.2',
          scripts: { install: 'echo charts' },
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          name: '@elastic/eui',
          version: '112.0.0',
          scripts: { postinstall: 'echo eui' },
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          name: '@elastic/datemath',
          version: '5.0.3',
          scripts: { postinstall: 'echo datemath' },
        })
      );
    mockSpawnSync.mockReturnValue(mockSpawnResult);

    runInstallScripts({ config, log: mockLog });

    expect(mockSpawnSync).toHaveBeenCalledTimes(3);
    // install scripts should run first, then postinstall
    expect(mockSpawnSync.mock.calls[0][0]).toBe('echo charts'); // @elastic/charts (install)
    expect(mockSpawnSync.mock.calls[1][0]).toBe('echo eui'); // @elastic/eui (postinstall)
    expect(mockSpawnSync.mock.calls[2][0]).toBe('echo datemath'); // @elastic/datemath (postinstall)
  });

  it('should run successfully when package.json has no version', () => {
    const config: InstallScriptsConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
      ],
    };
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ name: '@elastic/eui', scripts: { postinstall: 'echo' } })
    );
    mockSpawnSync.mockReturnValue(mockSpawnResult);

    expect(() => runInstallScripts({ config, log: mockLog })).not.toThrow();
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
  });

  describe('dry-run mode', () => {
    it('should not execute scripts when dryRun is true', () => {
      const config: InstallScriptsConfig = {
        packages: [
          { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        ],
      };
      const packageJson = {
        name: '@elastic/eui',
        version: '112.0.0',
        scripts: { postinstall: 'echo "test"' },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));

      runInstallScripts({ config, log: mockLog, dryRun: true });

      expect(mockSpawnSync).not.toHaveBeenCalled();
    });

    it('should log dry-run message when dryRun is true', () => {
      const config: InstallScriptsConfig = {
        packages: [
          { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        ],
      };
      const packageJson = {
        name: '@elastic/eui',
        version: '112.0.0',
        scripts: { postinstall: 'echo "test"' },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));

      runInstallScripts({ config, log: mockLog, dryRun: true });

      expect(mockLog.info).toHaveBeenCalledWith('Running 1 install script(s)...');
      expect(mockLog.info).toHaveBeenCalledWith(
        '[dry-run] Would run postinstall for @elastic/eui@112.0.0'
      );
    });

    it('should log dry-run message for multiple packages', () => {
      const config: InstallScriptsConfig = {
        packages: [
          { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
          { path: '@elastic/ecs', lifecycle: 'install', required: true, reason: 'Needed' },
        ],
      };

      mockFs.existsSync.mockReturnValue(true);
      // Mocks are in lifecycle order (install before postinstall) due to sorting
      mockFs.readFileSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@elastic/ecs',
            version: '9.0.0',
            scripts: { install: 'echo install' },
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@elastic/eui',
            version: '112.0.0',
            scripts: { postinstall: 'echo eui' },
          })
        );

      runInstallScripts({ config, log: mockLog, dryRun: true });

      expect(mockSpawnSync).not.toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith('Running 2 install script(s)...');
    });

    it('should still throw when package not found in dry-run mode', () => {
      const config: InstallScriptsConfig = {
        packages: [
          { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        ],
      };
      mockFs.existsSync.mockReturnValue(false);

      expect(() => runInstallScripts({ config, log: mockLog, dryRun: true })).toThrow(
        'Package not found'
      );
    });

    it('should still throw when lifecycle script missing in dry-run mode', () => {
      const config: InstallScriptsConfig = {
        packages: [
          { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        ],
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: '@elastic/eui', scripts: {} }));

      expect(() => runInstallScripts({ config, log: mockLog, dryRun: true })).toThrow(
        'No postinstall script found'
      );
    });
  });
});
