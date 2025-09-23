/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

// Mock repo root to a stable path
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));

// Provide a controllable mock for child_process.exec
type ExecResponder = (cmd: string) => { stdout: string };
let mockExecResponder: ExecResponder;

jest.mock('child_process', () => {
  return {
    exec: (cmd: string, _opts: any, cb: (err: any, result: { stdout: string }) => void) => {
      try {
        const result = mockExecResponder ? mockExecResponder(cmd) : { stdout: '' };
        cb(null, result);
      } catch (e) {
        cb(e, { stdout: '' });
      }
    },
  };
});

describe('getJestConfigs', () => {
  beforeEach(() => {
    mockExecResponder = () => ({ stdout: '' });
    jest.resetModules();
  });

  it('lists all configs and tests across repo when configPaths not provided', async () => {
    // Arrange mock outputs for two exec calls used in Promise.all
    const configFiles = [
      'pkg/a/jest.config.js',
      'pkg/b/jest.config.js',
      'pkg/c/jest.config.js',
    ].join('\n');

    const testFiles = ['pkg/a/foo.test.ts', 'pkg/a/sub/bar.test.tsx', 'pkg/c/baz.test.js'].join(
      '\n'
    );

    let call = 0;

    mockExecResponder = (cmd: string) => {
      call += 1;
      if (cmd.includes('*jest.config*.js')) {
        return { stdout: configFiles };
      }
      if (cmd.includes('*.test.ts') || cmd.includes('*.test.tsx')) {
        return { stdout: testFiles };
      }
      throw new Error(`unexpected command: ${cmd}`);
    };

    const { getJestConfigs } = await import('./get_jest_configs');

    // Act
    const { configsWithTests, emptyConfigs } = await getJestConfigs();

    // Assert
    expect(configsWithTests).toEqual([
      {
        config: resolve('/repo', 'pkg/a/jest.config.js'),
        testFiles: [
          resolve('/repo', 'pkg/a/foo.test.ts'),
          resolve('/repo', 'pkg/a/sub/bar.test.tsx'),
        ],
      },
      {
        config: resolve('/repo', 'pkg/c/jest.config.js'),
        testFiles: [resolve('/repo', 'pkg/c/baz.test.js')],
      },
    ]);

    expect(emptyConfigs).toEqual([resolve('/repo', 'pkg/b/jest.config.js')]);
  });

  it('limits test discovery to provided configPaths', async () => {
    const passed = ['pkg/a/jest.config.js', 'pkg/b/jest.config.js'];

    // Single exec call with pathspecs including both a and b
    mockExecResponder = (cmd: string) => {
      expect(cmd).toContain('git ls-files');
      expect(cmd).toContain(':(glob)pkg/a/**/');
      expect(cmd).toContain(':(glob)pkg/b/**/');

      return { stdout: ['pkg/a/only.test.ts'].join('\n') };
    };

    const { getJestConfigs } = await import('./get_jest_configs');

    const { configsWithTests, emptyConfigs } = await getJestConfigs(passed);

    expect(configsWithTests).toEqual([
      {
        config: resolve('/repo', 'pkg/a/jest.config.js'),
        testFiles: [resolve('/repo', 'pkg/a/only.test.ts')],
      },
    ]);

    expect(emptyConfigs).toEqual([resolve('/repo', 'pkg/b/jest.config.js')]);
  });
});
