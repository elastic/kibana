/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { FunctionalTestRunner } from '../functional_test_runner';
import { EsVersion, readConfigFile } from '../lib';
import { getAllFtrConfigsAndManifests } from '../lib/config/ftr_configs_manifest';
import {
  createSkippedTestId,
  discoverSkippedFtrTests,
  parseSkippedScoutTests,
} from './discover_skipped_tests';

jest.mock('node:module', () => ({
  createRequire: jest.fn(() => jest.fn(() => ({ __esModule: true, default: jest.fn() }))),
}));
jest.mock('../functional_test_runner', () => ({
  FunctionalTestRunner: jest.fn(),
}));
jest.mock('../lib', () => ({
  EsVersion: { getDefault: jest.fn() },
  readConfigFile: jest.fn(),
}));
jest.mock('../lib/config/ftr_configs_manifest', () => ({
  getAllFtrConfigsAndManifests: jest.fn(),
}));

const mockLog = { warning: jest.fn() } as unknown as ToolingLog;

describe('skipped test manifest discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates stable file::suite::test identifiers', () => {
    expect(createSkippedTestId('x-pack/example.spec.ts', 'example suite', 'is skipped')).toBe(
      'x-pack/example.spec.ts::example suite::is skipped'
    );
  });

  it('normalizes skipped Scout test targets from Playwright list JSON', () => {
    expect(
      parseSkippedScoutTests('x-pack/example/test/scout/ui/playwright.config.ts', {
        config: { rootDir: `${REPO_ROOT}/x-pack/example/test/scout/ui/tests` },
        suites: [
          {
            title: 'example.spec.ts',
            file: 'example.spec.ts',
            specs: [],
            suites: [
              {
                title: 'example suite',
                file: 'example.spec.ts',
                specs: [
                  {
                    title: 'runs',
                    file: 'example.spec.ts',
                    line: 10,
                    tests: [{ expectedStatus: 'passed', projectId: 'local' }],
                  },
                  {
                    title: 'is skipped',
                    file: 'example.spec.ts',
                    line: 20,
                    tests: [{ expectedStatus: 'skipped', projectId: 'mki' }],
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toEqual([
      {
        id: 'x-pack/example/test/scout/ui/tests/example.spec.ts::example suite::is skipped',
        framework: 'scout',
        config: 'x-pack/example/test/scout/ui/playwright.config.ts',
        target: 'mki',
        file: 'x-pack/example/test/scout/ui/tests/example.spec.ts',
        suite: 'example suite',
        test: 'is skipped',
        line: 20,
        state: 'skipped',
      },
    ]);
  });

  it('normalizes FTR skips and records unavailable configurations', async () => {
    const configWithTests = {
      get: jest.fn((key) => (key === 'testFiles' ? ['test.ts'] : undefined)),
      module: { type: 'config' },
    };
    const unavailableConfigPath = `${REPO_ROOT}/x-pack/example/external.config.ts`;
    const ftrConfigPath = `${REPO_ROOT}/x-pack/example/config.ts`;
    const getSkippedTests = jest.fn().mockResolvedValue([
      {
        file: `${REPO_ROOT}/x-pack/example/test/functional/example.ts`,
        suite: 'example suite',
        test: 'is skipped',
      },
    ]);

    (getAllFtrConfigsAndManifests as jest.Mock).mockReturnValue({
      ftrConfigEntries: new Map([
        [ftrConfigPath, []],
        [unavailableConfigPath, []],
      ]),
    });
    (readConfigFile as jest.Mock)
      .mockResolvedValueOnce(configWithTests)
      .mockRejectedValueOnce(new Error('requires external test environment'));
    (EsVersion.getDefault as jest.Mock).mockReturnValue('8.0.0');
    (FunctionalTestRunner as jest.Mock).mockImplementation(() => ({ getSkippedTests }));

    await expect(discoverSkippedFtrTests(mockLog)).resolves.toEqual({
      skippedTests: [
        {
          id: 'x-pack/example/test/functional/example.ts::example suite::is skipped',
          framework: 'ftr',
          config: 'x-pack/example/config.ts',
          target: 'x-pack/example/config.ts',
          file: 'x-pack/example/test/functional/example.ts',
          suite: 'example suite',
          test: 'is skipped',
          state: 'skipped',
        },
      ],
      unavailableConfigs: [
        {
          framework: 'ftr',
          config: 'x-pack/example/external.config.ts',
          error: 'requires external test environment',
        },
      ],
    });
  });
});
