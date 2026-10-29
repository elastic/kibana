/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';

import { queryMoonJestUnitSelection, queryMoonTestSelection } from './moon_test_tasks.ts';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('./strategy_moon.ts', () => ({
  getMoonBinPath: () => '/repo/node_modules/.bin/moon',
}));
jest.mock('../get_kibana_dir.ts', () => ({ getKibanaDir: () => '/repo' }));

describe('queryMoonJestUnitSelection', () => {
  beforeEach(() => jest.mocked(execFileSync).mockReset());

  it('queries affected Jest tasks with the same changed files used by CI', () => {
    jest
      .mocked(execFileSync)
      .mockReturnValueOnce(
        JSON.stringify({
          tasks: {
            foo: { jest: { args: ['scripts/moon_jest.js', 'foo/jest.config.js', '--'] } },
            bar: { jest: { args: ['scripts/moon_jest.js', 'bar/jest.config.mjs', '--'] } },
          },
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          tasks: { foo: { jest: { args: ['scripts/moon_jest.js', 'foo/jest.config.js', '--'] } } },
        })
      )
      .mockReturnValueOnce(JSON.stringify({ projects: [{ id: 'foo', source: 'foo' }] }))
      .mockReturnValueOnce(JSON.stringify(['foo/jest.config.js']));

    const selection = queryMoonJestUnitSelection(['foo/src/index.ts']);

    expect(selection.modeledConfigs).toEqual(
      new Set(['foo/jest.config.js', 'bar/jest.config.mjs'])
    );
    expect(selection.affectedConfigs).toEqual(new Set(['foo/jest.config.js']));
    expect(jest.mocked(execFileSync).mock.calls[1][1]).toEqual([
      'query',
      'tasks',
      '--tags',
      '^jest-unit-tests$',
      '--affected',
      '--downstream',
      'deep',
    ]);
    expect(jest.mocked(execFileSync).mock.calls[1][2]).toMatchObject({
      input: JSON.stringify({ files: ['foo/src/index.ts'] }),
    });
    expect(jest.mocked(execFileSync).mock.calls[3][2]).toMatchObject({
      input: JSON.stringify({
        projects: [{ sourceRoot: 'foo', configs: ['foo/jest.config.js'] }],
        changedFiles: ['foo/src/index.ts'],
        kind: 'jest-unit',
      }),
    });
  });

  it.each([
    ['jest-integration-tests', 'jestIntegrationConfigs', 'foo/jest.integration.config.mjs'],
    ['scout-tests', 'scoutConfigs', 'foo/test/scout/ui/custom.playwright.config.ts'],
  ] as const)('reads %s configs directly from %s task args', (tag, taskId, config) => {
    const taskQuery = JSON.stringify({ tasks: { foo: { [taskId]: { args: [config] } } } });
    jest
      .mocked(execFileSync)
      .mockReturnValueOnce(taskQuery)
      .mockReturnValueOnce(taskQuery)
      .mockReturnValueOnce(JSON.stringify({ projects: [{ id: 'foo', source: 'foo' }] }))
      .mockReturnValueOnce(JSON.stringify([config]));

    const selection = queryMoonTestSelection(['foo/src/index.ts'], tag);

    expect(selection.modeledConfigs).toEqual(new Set([config]));
    expect(selection.affectedConfigs).toEqual(new Set([config]));
  });
});
