/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import jestDiff from 'jest-diff';
import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';

import { reformatJestDiff, getOptimizerCacheKey, diffCacheKey } from './cache_keys';
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
              "bootstrap": "<bootstrap cache>",
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
                  "v7dark",
                  "v7light",
                ],
              },
            }
          `);
  });
});

describe('diffCacheKey()', () => {
  it('returns undefined if values are equal', () => {
    expect(diffCacheKey('1', '1')).toBe(undefined);
    expect(diffCacheKey(1, 1)).toBe(undefined);
    expect(diffCacheKey(['1', '2', { a: 'b' }], ['1', '2', { a: 'b' }])).toBe(undefined);
    expect(
      diffCacheKey(
        {
          a: '1',
          b: '2',
        },
        {
          b: '2',
          a: '1',
        }
      )
    ).toBe(undefined);
  });

  it('returns a diff if the values are different', () => {
    expect(diffCacheKey(['1', '2', { a: 'b' }], ['1', '2', { b: 'a' }])).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  [[22m
      [2m    \\"1\\",[22m
      [2m    \\"2\\",[22m
      [2m    {[22m
      [32m-     \\"a\\": \\"b\\"[39m
      [31m+     \\"b\\": \\"a\\"[39m
      [2m    }[22m
      [2m  ][22m"
    `);
    expect(
      diffCacheKey(
        {
          a: '1',
          b: '1',
        },
        {
          b: '2',
          a: '2',
        }
      )
    ).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  {[22m
      [32m-   \\"a\\": \\"1\\",[39m
      [32m-   \\"b\\": \\"1\\"[39m
      [31m+   \\"a\\": \\"2\\",[39m
      [31m+   \\"b\\": \\"2\\"[39m
      [2m  }[22m"
    `);
  });
});

describe('reformatJestDiff()', () => {
  it('reformats large jestDiff output to focus on the changed lines', () => {
    const diff = jestDiff(
      {
        a: ['1', '1', '1', '1', '1', '1', '1', '2', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
      },
      {
        b: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '2', '1', '1', '1', '1'],
      }
    );

    expect(reformatJestDiff(diff)).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  Object {[22m
      [32m-   \\"a\\": Array [[39m
      [31m+   \\"b\\": Array [[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [32m-     \\"2\\",[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [31m+     \\"2\\",[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m"
    `);
  });
});
