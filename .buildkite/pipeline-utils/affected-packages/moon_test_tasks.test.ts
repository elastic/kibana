/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';

import { queryMoonTestSelection, queryMoonTestSelections } from './moon_test_tasks.ts';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('./strategy_moon.ts', () => ({
  getMoonBinPath: () => '/repo/node_modules/.bin/moon',
}));
jest.mock('../get_kibana_dir.ts', () => ({ getKibanaDir: () => '/repo' }));

describe('queryMoonTestSelections', () => {
  beforeEach(() => jest.mocked(execFileSync).mockReset());

  it('queries Jest unit and integration tasks together with the changed files used by CI', () => {
    jest
      .mocked(execFileSync)
      .mockReturnValueOnce(
        JSON.stringify({
          tasks: {
            foo: {
              jest: { args: ['scripts/moon_jest.js', 'foo/jest.config.js', '--'] },
              jestIntegrationConfigs: { args: ['foo/jest.integration.config.js'] },
            },
            bar: { jest: { args: ['scripts/moon_jest.js', 'bar/jest.config.mjs', '--'] } },
          },
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          tasks: {
            foo: {
              jest: { args: ['scripts/moon_jest.js', 'foo/jest.config.js', '--'] },
              jestIntegrationConfigs: { args: ['foo/jest.integration.config.js'] },
            },
          },
        })
      );

    const selections = queryMoonTestSelections(
      ['foo/src/index.ts'],
      ['jest-unit-tests', 'jest-integration-tests']
    );

    expect(selections.get('jest-unit-tests')).toEqual({
      modeledConfigs: new Set(['foo/jest.config.js', 'bar/jest.config.mjs']),
      affectedConfigs: new Set(['foo/jest.config.js']),
    });
    expect(selections.get('jest-integration-tests')).toEqual({
      modeledConfigs: new Set(['foo/jest.integration.config.js']),
      affectedConfigs: new Set(['foo/jest.integration.config.js']),
    });
    // Jest selection needs neither project sources nor the config narrowing script.
    expect(execFileSync).toHaveBeenCalledTimes(2);
    expect(jest.mocked(execFileSync).mock.calls[1][1]).toEqual([
      'query',
      'tasks',
      '--tags',
      '^(jest-unit-tests|jest-integration-tests)$',
      '--affected',
      '--downstream',
      'deep',
    ]);
    expect(jest.mocked(execFileSync).mock.calls[1][2]).toMatchObject({
      input: JSON.stringify({ files: ['foo/src/index.ts'] }),
    });
  });

  it('throws when a Jest unit task has no config separator', () => {
    const taskQuery = JSON.stringify({
      tasks: { foo: { jest: { args: ['scripts/moon_jest.js', 'foo/jest.config.js'] } } },
    });
    jest.mocked(execFileSync).mockReturnValueOnce(taskQuery).mockReturnValueOnce(taskQuery);

    expect(() => queryMoonTestSelections(['foo/src/index.ts'], ['jest-unit-tests'])).toThrow(
      'Moon project foo has no Jest config separator'
    );
  });
});

describe('queryMoonTestSelection', () => {
  beforeEach(() => jest.mocked(execFileSync).mockReset());

  it('narrows Scout configs through project sources and the selection script', () => {
    const config = 'foo/test/scout/ui/custom.playwright.config.ts';
    const taskQuery = JSON.stringify({ tasks: { foo: { scoutConfigs: { args: [config] } } } });
    jest
      .mocked(execFileSync)
      .mockReturnValueOnce(taskQuery)
      .mockReturnValueOnce(taskQuery)
      .mockReturnValueOnce(JSON.stringify({ projects: [{ id: 'foo', source: 'foo' }] }))
      .mockReturnValueOnce(JSON.stringify([config]));

    const selection = queryMoonTestSelection(['foo/src/index.ts'], 'scout-tests');

    expect(selection.modeledConfigs).toEqual(new Set([config]));
    expect(selection.affectedConfigs).toEqual(new Set([config]));
    expect(jest.mocked(execFileSync).mock.calls[3][2]).toMatchObject({
      input: JSON.stringify({
        projects: [{ sourceRoot: 'foo', configs: [config] }],
        changedFiles: ['foo/src/index.ts'],
        kind: 'scout',
      }),
    });
  });
});
