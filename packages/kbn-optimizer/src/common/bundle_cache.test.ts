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

import { BundleCache, State } from './bundle_cache';

jest.mock('fs');
const mockReadFileSync: jest.Mock = jest.requireMock('fs').readFileSync;
const mockMkdirSync: jest.Mock = jest.requireMock('fs').mkdirSync;
const mockWriteFileSync: jest.Mock = jest.requireMock('fs').writeFileSync;

const SOME_STATE: State = {
  cacheKey: 'abc',
  files: ['123'],
  moduleCount: 123,
  optimizerCacheKey: 'abc',
};

beforeEach(() => {
  jest.clearAllMocks();
});

it(`doesn't complain if files are not on disk`, () => {
  const cache = new BundleCache('/foo/bar.json');
  expect(cache.get()).toEqual({});
});

it(`updates files on disk when calling set()`, () => {
  const cache = new BundleCache('/foo/bar.json');
  cache.set(SOME_STATE);
  expect(mockReadFileSync).not.toHaveBeenCalled();
  expect(mockMkdirSync.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "/foo",
        Object {
          "recursive": true,
        },
      ],
    ]
  `);
  expect(mockWriteFileSync.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "/foo/bar.json",
        "{
      \\"cacheKey\\": \\"abc\\",
      \\"files\\": [
        \\"123\\"
      ],
      \\"moduleCount\\": 123,
      \\"optimizerCacheKey\\": \\"abc\\"
    }",
      ],
    ]
  `);
});

it(`serves updated state from memory`, () => {
  const cache = new BundleCache('/foo/bar.json');
  cache.set(SOME_STATE);
  jest.clearAllMocks();

  expect(cache.get()).toEqual(SOME_STATE);
  expect(mockReadFileSync).not.toHaveBeenCalled();
  expect(mockMkdirSync).not.toHaveBeenCalled();
  expect(mockWriteFileSync).not.toHaveBeenCalled();
});

it('reads state from disk on get() after refresh()', () => {
  const cache = new BundleCache('/foo/bar.json');
  cache.set(SOME_STATE);
  cache.refresh();
  jest.clearAllMocks();

  cache.get();
  expect(mockMkdirSync).not.toHaveBeenCalled();
  expect(mockWriteFileSync).not.toHaveBeenCalled();
  expect(mockReadFileSync.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "/foo/bar.json",
        "utf8",
      ],
    ]
  `);
});

it('provides accessors to specific state properties', () => {
  const cache = new BundleCache('/foo/bar.json');

  expect(cache.getModuleCount()).toBe(undefined);
  expect(cache.getReferencedFiles()).toEqual(undefined);
  expect(cache.getCacheKey()).toEqual(undefined);
  expect(cache.getOptimizerCacheKey()).toEqual(undefined);

  cache.set(SOME_STATE);

  expect(cache.getModuleCount()).toBe(123);
  expect(cache.getReferencedFiles()).toEqual(['123']);
  expect(cache.getCacheKey()).toEqual('abc');
  expect(cache.getOptimizerCacheKey()).toEqual('abc');
});
