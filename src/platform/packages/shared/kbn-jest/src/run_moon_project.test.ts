/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';

jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));

import { runMoonJestProject } from './run_moon_project';

describe('runMoonJestProject', () => {
  const originalArgv = process.argv;
  const originalAffectedFiles = process.env.MOON_AFFECTED_FILES;
  const originalExitCode = process.exitCode;

  afterEach(() => {
    process.argv = originalArgv;
    if (originalAffectedFiles === undefined) {
      delete process.env.MOON_AFFECTED_FILES;
    } else {
      process.env.MOON_AFFECTED_FILES = originalAffectedFiles;
    }
    process.exitCode = originalExitCode;
    jest.resetAllMocks();
  });

  it('runs every config in an affected project even when only one contains a changed test', () => {
    process.argv = [
      'node',
      'scripts/moon_jest.js',
      'project/public/jest.config.js',
      'project/server/jest.config.js',
      '--',
      '--maxWorkers=2',
    ];
    process.env.MOON_AFFECTED_FILES = 'project/public/example.test.ts';
    jest.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);

    runMoonJestProject();

    expect(jest.mocked(spawnSync).mock.calls.map(([, args]) => args)).toEqual([
      [
        'scripts/jest.js',
        '--passWithNoTests',
        '--config',
        'project/public/jest.config.js',
        '--maxWorkers=2',
      ],
      [
        'scripts/jest.js',
        '--passWithNoTests',
        '--config',
        'project/server/jest.config.js',
        '--maxWorkers=2',
      ],
    ]);
  });

  it('forwards short options and positional test filters after the config separator', () => {
    process.argv = [
      'node',
      'scripts/moon_jest.js',
      'project/jest.config.js',
      '--',
      '-u',
      'example.test.ts',
    ];
    jest.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);

    runMoonJestProject();

    expect(jest.mocked(spawnSync).mock.calls[0][1]).toEqual([
      'scripts/jest.js',
      '--passWithNoTests',
      '--config',
      'project/jest.config.js',
      '-u',
      'example.test.ts',
    ]);
  });
});
