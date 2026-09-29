/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = {
      run: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/dev-cli-errors', () => {
      const mocked = {
      createFailError: (message: string) => new Error(message),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/dev-validation-runner', () => {
      const mocked = {
      buildValidationCliArgs: vi.fn(),
      describeValidationNoTargetsScope: vi.fn(),
      formatReproductionCommand: vi.fn(),
      readValidationRunFlags: vi.fn(),
      resolveValidationBaseContext: vi.fn(),
      VALIDATION_RUN_HELP: [],
      VALIDATION_RUN_STRING_FLAGS: [],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/repo-info', () => {
      const mocked = {
      REPO_ROOT: '/repo',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../jest-preset', () => {
      const mocked = {
      testMatch: ['**/*.test.ts'],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./run', () => {
      const mocked = {
      findConfigInDirectoryTree: vi.fn(),
      runJest: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

import { planJestContractRuns } from './run_contract';

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
