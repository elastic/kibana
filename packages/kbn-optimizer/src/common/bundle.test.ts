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

import { Bundle, BundleSpec, parseBundles } from './bundle';

jest.mock('fs');

const SPEC: BundleSpec = {
  contextDir: '/foo/bar',
  publicDirNames: ['public'],
  id: 'bar',
  outputDir: '/foo/bar/target',
  sourceRoot: '/foo',
  type: 'plugin',
};

it('creates cache keys', () => {
  const bundle = new Bundle(SPEC);
  expect(
    bundle.createCacheKey(
      ['/foo/bar/a', '/foo/bar/c'],
      new Map([
        ['/foo/bar/a', 123],
        ['/foo/bar/b', 456],
        ['/foo/bar/c', 789],
      ])
    )
  ).toMatchInlineSnapshot(`
    Object {
      "mtimes": Object {
        "/foo/bar/a": 123,
        "/foo/bar/c": 789,
      },
      "spec": Object {
        "contextDir": "/foo/bar",
        "id": "bar",
        "manifestPath": undefined,
        "outputDir": "/foo/bar/target",
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": "/foo",
        "type": "plugin",
      },
    }
  `);
});

it('provides serializable versions of itself', () => {
  const bundle = new Bundle(SPEC);
  expect(bundle.toSpec()).toEqual(SPEC);
});

it('provides the module count from the cache', () => {
  const bundle = new Bundle(SPEC);
  expect(bundle.cache.getModuleCount()).toBe(undefined);
  bundle.cache.set({ moduleCount: 123 });
  expect(bundle.cache.getModuleCount()).toBe(123);
});

it('parses bundles from JSON specs', () => {
  const bundles = parseBundles(JSON.stringify([SPEC]));

  expect(bundles).toMatchInlineSnapshot(`
    Array [
      Bundle {
        "cache": BundleCache {
          "path": "/foo/bar/target/.kbn-optimizer-cache",
          "state": undefined,
        },
        "contextDir": "/foo/bar",
        "id": "bar",
        "manifestPath": undefined,
        "outputDir": "/foo/bar/target",
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": "/foo",
        "type": "plugin",
      },
    ]
  `);
});
