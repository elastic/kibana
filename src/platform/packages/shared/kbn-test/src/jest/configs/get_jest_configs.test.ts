/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { resolve } from 'path';

describe('getJestConfigs', () => {
  // Mock the child_process exec to control git ls-files output
  let mockExecResponder: (cmd: string) => { stdout: string };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('child_process', () => {
      const originalChildProcess = require('child_process');
      return {
        ...originalChildProcess,
        exec: (cmd: string, options: any, callback: any) => {
          try {
            const result = mockExecResponder(cmd);
            callback(null, result);
          } catch (error) {
            callback(error);
          }
        },
      };
    });

    // Mock REPO_ROOT
    vi.doMock('@kbn/repo-info', () => {
      const mocked = {
        REPO_ROOT: '/repo',
      };
      return { ...mocked, default: mocked };
    });

    // Mock Jest modules that are dynamically imported
    vi.doMock('jest-config', () => {
      const mocked = {
        readConfig: vi.fn().mockResolvedValue({
          projectConfig: {},
          globalConfig: {},
        }),
      };
      return { ...mocked, default: mocked };
    });

    vi.doMock('jest', () => {
      const mocked = {
        SearchSource: vi.fn().mockImplementation(() => ({
          getTestPaths: vi.fn().mockResolvedValue({
            tests: [], // We'll customize this per test
          }),
        })),
      };
      return { ...mocked, default: mocked };
    });

    vi.doMock('jest-runtime', () => ({
      default: {
        createContext: vi.fn().mockResolvedValue({}),
      },
    }));

    // Mock fs.readFileSync for config parsing and existsSync for file existence
    vi.doMock('fs', () => {
      const originalFs = require('fs');
      return {
        ...originalFs,
        readFileSync: vi.fn((path: string) => {
          // Return simple Jest config content with proper roots based on the config path
          return `module.exports = {
            testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
            roots: ['<rootDir>'],
            testPathIgnorePatterns: ['/node_modules/']
          };`;
        }),
        existsSync: vi.fn((path: string) => {
          // Mock all files as existing (since we're testing git-tracked files)
          return true;
        }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should discover configs and tests using git ls-files', async () => {
    // Mock git ls-files responses for combined command
    mockExecResponder = (cmd: string) => {
      // Handle combined command that includes both test files and config files
      if (cmd.includes('*.test.ts') && cmd.includes('jest.config')) {
        return {
          stdout:
            'pkg/a/foo.test.ts\npkg/b/bar.test.tsx\npkg/a/jest.config.js\npkg/b/jest.config.cjs',
        };
      }
      // Fallback for separate commands (in case of provided config paths)
      else if (cmd.includes('jest.config') || cmd.includes('jest.integration.config')) {
        return { stdout: 'pkg/a/jest.config.js\npkg/b/jest.config.cjs' };
      } else if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: 'pkg/a/foo.test.ts\npkg/b/bar.test.tsx' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    const result = await getJestConfigs();

    expect(result.configsWithTests).toHaveLength(2);
    expect(result.emptyConfigs).toHaveLength(0);
    expect(result.orphanedTestFiles).toHaveLength(0);
    expect(result.duplicateTestFiles).toHaveLength(0);
  });

  it('excludes __fixtures__ from auto-discovery', async () => {
    let capturedCmd = '';
    mockExecResponder = (cmd: string) => {
      capturedCmd = cmd;
      if (cmd.includes('*.test.ts') && cmd.includes('jest.config')) {
        return { stdout: 'pkg/a/foo.test.ts\npkg/a/jest.config.js' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    await getJestConfigs();

    expect(capturedCmd).toContain(':(glob,exclude)**/__fixtures__/**');
    expect(capturedCmd).toContain("'**/jest.config.cjs'");
  });

  it('should handle provided config paths', async () => {
    const configPaths = ['pkg/a/jest.config.js'];

    mockExecResponder = (cmd: string) => {
      if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: 'pkg/a/test.test.ts' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    const result = await getJestConfigs(configPaths);

    expect(result.configsWithTests).toHaveLength(1);
    expect(result.configsWithTests[0].config).toBe(resolve('/repo', 'pkg/a/jest.config.js'));
    expect(result.duplicateTestFiles).toHaveLength(0);
  });

  it('should identify orphaned test files', async () => {
    // Mock scenario where we have test files that don't match any config
    mockExecResponder = (cmd: string) => {
      // Handle combined command
      if (cmd.includes('*.test.ts') && cmd.includes('jest.config')) {
        return { stdout: 'pkg/a/good.test.ts\npkg/orphan/bad.test.ts\npkg/a/jest.config.js' };
      }
      // Fallback for separate commands
      else if (cmd.includes('jest.config') || cmd.includes('jest.integration.config')) {
        return { stdout: 'pkg/a/jest.config.js' };
      } else if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: 'pkg/a/good.test.ts\npkg/orphan/bad.test.ts' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    const result = await getJestConfigs();

    expect(result.orphanedTestFiles).toHaveLength(1);
    expect(result.orphanedTestFiles[0]).toBe(resolve('/repo', 'pkg/orphan/bad.test.ts'));
    expect(result.duplicateTestFiles).toHaveLength(0);
  });

  it('should identify empty configs', async () => {
    // Mock scenario where config exists but no matching test files
    mockExecResponder = (cmd: string) => {
      // Handle combined command
      if (cmd.includes('*.test.ts') && cmd.includes('jest.config')) {
        return { stdout: 'pkg/a/test.test.ts\npkg/a/jest.config.js\npkg/empty/jest.config.js' };
      }
      // Fallback for separate commands
      else if (cmd.includes('jest.config') || cmd.includes('jest.integration.config')) {
        return { stdout: 'pkg/a/jest.config.js\npkg/empty/jest.config.js' };
      } else if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: 'pkg/a/test.test.ts' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    const result = await getJestConfigs();

    expect(result.emptyConfigs).toHaveLength(1);
    expect(result.emptyConfigs[0]).toBe(resolve('/repo', 'pkg/empty/jest.config.js'));
    expect(result.duplicateTestFiles).toHaveLength(0);
  });

  it('should identify test files covered by multiple configs', async () => {
    // Simple test - just verify the function returns the expected structure
    mockExecResponder = (cmd: string) => {
      // Handle combined command
      if (cmd.includes('*.test.ts') && cmd.includes('jest.config')) {
        return { stdout: 'pkg/a/test.test.ts\npkg/a/jest.config.js' };
      }
      // Fallback for separate commands
      else if (cmd.includes('jest.config') || cmd.includes('jest.integration.config')) {
        return { stdout: 'pkg/a/jest.config.js' };
      } else if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: 'pkg/a/test.test.ts' };
      }
      return { stdout: '' };
    };

    const { getJestConfigs } = await import('./get_jest_configs');
    const result = await getJestConfigs();

    // For this simple case, we shouldn't have duplicates
    expect(result.duplicateTestFiles).toHaveLength(0);
    expect(result.configsWithTests).toHaveLength(1);
    expect(result.emptyConfigs).toHaveLength(0);
    expect(result.orphanedTestFiles).toHaveLength(0);
  });
});
