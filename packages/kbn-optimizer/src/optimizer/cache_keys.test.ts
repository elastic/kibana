/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';

import { getOptimizerCacheKey } from './cache_keys';
import { OptimizerConfig } from './optimizer_config';

jest.mock('./get_changes.ts', () => ({
  getChanges: async () =>
    new Map([
      ['/foo/bar/a', 'modified'],
      ['/foo/bar/b', 'modified'],
      ['/foo/bar/c', 'deleted'],
    ]),
}));

jest.mock('./get_mtimes.ts', () => ({
  getMtimes: async (paths: string[]) => new Map(paths.map((path) => [path, 12345])),
}));

jest.mock('execa');

jest.mock('fs', () => {
  const realFs = jest.requireActual('fs');
  return {
    ...realFs,
    readFile: jest.fn(realFs.readFile),
  };
});

expect.addSnapshotSerializer(createAbsolutePathSerializer());

jest.requireMock('execa').mockImplementation(async (cmd: string, args: string[], opts: object) => {
  expect(cmd).toBe('git');
  expect(args).toEqual([
    'log',
    '-n',
    '1',
    '--pretty=format:%H',
    '--',
    expect.stringContaining('kbn-optimizer'),
  ]);
  expect(opts).toEqual({
    cwd: REPO_ROOT,
  });

  return {
    stdout: '<last commit sha>',
  };
});

describe('getOptimizerCacheKey()', () => {
  it('uses latest commit, bootstrap cache, and changed files to create unique value', async () => {
    jest
      .requireMock('fs')
      .readFile.mockImplementation(
        (path: string, enc: string, cb: (err: null, file: string) => void) => {
          expect(path).toBe(
            Path.resolve(REPO_ROOT, 'packages/kbn-optimizer/target/.bootstrap-cache')
          );
          expect(enc).toBe('utf8');
          cb(null, '<bootstrap cache>');
        }
      );

    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
    });

    await expect(getOptimizerCacheKey(config)).resolves.toMatchInlineSnapshot(`
            Object {
              "deletedPaths": Array [
                "/foo/bar/c",
              ],
              "lastCommit": "<last commit sha>",
              "modifiedTimes": Object {
                "/foo/bar/a": 12345,
                "/foo/bar/b": 12345,
              },
              "workerConfig": Object {
                "browserslistEnv": "dev",
                "dist": false,
                "optimizerCacheKey": "♻",
                "repoRoot": <absolute path>,
                "themeTags": Array [
                  "v8dark",
                  "v8light",
                ],
              },
            }
          `);
  });
});
