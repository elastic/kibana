/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { getOptimizerCacheKey } from './optimizer_cache_key';
import { OptimizerConfig } from './optimizer_config';

jest.mock('@kbn/synthetic-package-map', () => {
  return {
    readHashOfPackageMap() {
      return '<hash of package map>';
    },
  };
});

jest.mock('../common/hashes', () => {
  return {
    Hashes: class MockHashes {
      static ofFiles = jest.fn(() => {
        return new MockHashes();
      });

      cacheToJson() {
        return { foo: 'bar' };
      }
    },
  };
});

jest.mock('./optimizer_built_paths', () => {
  return {
    getOptimizerBuiltPaths: () => ['/built/foo.js', '/built/bar.js'],
  };
});

const { Hashes: MockHashes } = jest.requireMock('../common/hashes');

expect.addSnapshotSerializer(createAbsolutePathSerializer());

describe('getOptimizerCacheKey()', () => {
  it('determines checksums of all optimizer files', async () => {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
    });

    const key = await getOptimizerCacheKey(config);

    expect(MockHashes.ofFiles).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              "/built/foo.js",
              "/built/bar.js",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": MockHashes {},
          },
        ],
      }
    `);

    expect(key).toMatchInlineSnapshot(`
      Object {
        "checksums": Object {
          "foo": "bar",
        },
        "synthPackages": "<hash of package map>",
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
