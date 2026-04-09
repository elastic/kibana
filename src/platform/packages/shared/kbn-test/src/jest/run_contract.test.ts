/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/dev-validation-runner', () => ({
  buildValidationCliArgs: jest.fn(),
  describeValidationNoTargetsScope: jest.fn(),
  formatReproductionCommand: jest.fn(),
  readValidationRunFlags: jest.fn(),
  resolveValidationBaseContext: jest.fn(),
  VALIDATION_RUN_HELP: [],
  VALIDATION_RUN_STRING_FLAGS: [],
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

jest.mock('../../jest-preset', () => ({
  testMatch: ['**/*.test.ts'],
}));

jest.mock('./run', () => ({
  findConfigInDirectoryTree: jest.fn(),
  runJest: jest.fn(),
}));

import { parseJestRunOutput, planJestContractRuns } from './run_contract';

describe('planJestContractRuns', () => {
  it('forces a full config run for config-only changes', () => {
    expect(
      planJestContractRuns({
        testMode: 'affected',
        entries: [
          {
            repoRelPath: 'packages/foo/jest.config.js',
            isConfigFile: true,
            isTestFile: false,
          },
        ],
      })
    ).toEqual([
      {
        configPath: '/repo/packages/foo/jest.config.js',
        mode: 'full',
      },
    ]);
  });

  it('keeps test-only affected changes on the related-test fast path', () => {
    expect(
      planJestContractRuns({
        testMode: 'affected',
        entries: [
          {
            repoRelPath: 'packages/foo/src/b.test.ts',
            owningConfigPath: '/repo/packages/foo/jest.config.js',
            isConfigFile: false,
            isTestFile: true,
          },
          {
            repoRelPath: 'packages/foo/src/a.test.ts',
            owningConfigPath: '/repo/packages/foo/jest.config.js',
            isConfigFile: false,
            isTestFile: true,
          },
        ],
      })
    ).toEqual([
      {
        configPath: '/repo/packages/foo/jest.config.js',
        mode: 'related',
        relatedFiles: ['packages/foo/src/a.test.ts', 'packages/foo/src/b.test.ts'],
      },
    ]);
  });

  it('escalates affected mode to a full config run when non-test files change', () => {
    expect(
      planJestContractRuns({
        testMode: 'affected',
        entries: [
          {
            repoRelPath: 'packages/foo/src/foo.test.ts',
            owningConfigPath: '/repo/packages/foo/jest.config.js',
            isConfigFile: false,
            isTestFile: true,
          },
          {
            repoRelPath: 'packages/foo/src/foo.ts',
            owningConfigPath: '/repo/packages/foo/jest.config.js',
            isConfigFile: false,
            isTestFile: false,
          },
        ],
      })
    ).toEqual([
      {
        configPath: '/repo/packages/foo/jest.config.js',
        mode: 'full',
      },
    ]);
  });

  it('still forces a full config run in related mode when the config file itself changes', () => {
    expect(
      planJestContractRuns({
        testMode: 'related',
        entries: [
          {
            repoRelPath: 'packages/foo/jest.config.js',
            isConfigFile: true,
            isTestFile: false,
          },
          {
            repoRelPath: 'packages/foo/src/foo.test.ts',
            owningConfigPath: '/repo/packages/foo/jest.config.js',
            isConfigFile: false,
            isTestFile: true,
          },
        ],
      })
    ).toEqual([
      {
        configPath: '/repo/packages/foo/jest.config.js',
        mode: 'full',
      },
    ]);
  });
});

describe('parseJestRunOutput', () => {
  it('extracts failed test files and summary lines from jest stdout', () => {
    expect(
      parseJestRunOutput(`
        PASS packages/foo/src/a.test.ts
        FAIL packages/foo/src/b.test.ts
        FAIL packages/foo/src/c.test.ts

        Test Suites: 2 failed, 1 passed, 3 total
        Tests:       4 failed, 10 passed, 14 total
        Snapshots:   3 failed, 1 passed, 4 total
      `)
    ).toEqual({
      excerpt: [
        'PASS packages/foo/src/a.test.ts',
        'FAIL packages/foo/src/b.test.ts',
        'FAIL packages/foo/src/c.test.ts',
        'Test Suites: 2 failed, 1 passed, 3 total',
        'Tests:       4 failed, 10 passed, 14 total',
        'Snapshots:   3 failed, 1 passed, 4 total',
      ],
      failedTestFiles: ['packages/foo/src/b.test.ts', 'packages/foo/src/c.test.ts'],
      snapshots: 'Snapshots:   3 failed, 1 passed, 4 total',
      suites: 'Test Suites: 2 failed, 1 passed, 3 total',
      tests: 'Tests:       4 failed, 10 passed, 14 total',
    });
  });
});
