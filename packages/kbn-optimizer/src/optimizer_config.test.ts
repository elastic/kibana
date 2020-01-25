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

jest.mock('./assign_bundles_to_workers.ts');
jest.mock('./new_platform_plugins.ts');
jest.mock('./optimizer_cache.ts');
jest.mock('./get_bundle_definitions.ts');

import Path from 'path';
import Os from 'os';

import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';

import { OptimizerConfig } from './optimizer_config';
import { OptimizerCache as OC } from './optimizer_cache';

jest.spyOn(Os, 'cpus').mockReturnValue(['foo'] as any);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OptimizerConfig::parseOptions()', () => {
  it('validates that repoRoot is absolute', () => {
    expect(() =>
      OptimizerConfig.parseOptions({ repoRoot: 'foo/bar' })
    ).toThrowErrorMatchingInlineSnapshot(`"repoRoot must be an absolute path"`);
  });

  it('validates that pluginScanDirs are absolute', () => {
    expect(() =>
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: ['foo/bar'],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"pluginScanDirs must all be absolute paths"`);
  });

  it('validates that pluginPaths are absolute', () => {
    expect(() =>
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginPaths: ['foo/bar'],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"pluginPaths must all be absolute paths"`);
  });

  it('validates that extraPluginScanDirs are absolute', () => {
    expect(() =>
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        extraPluginScanDirs: ['foo/bar'],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"extraPluginScanDirs must all be absolute paths"`);
  });

  it('validates that maxWorkerCount is a number', () => {
    expect(() => {
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        maxWorkerCount: NaN,
      });
    }).toThrowErrorMatchingInlineSnapshot(`"worker count must be a number"`);
  });

  it('validates that bundleMetdataPath is absolute', () => {
    expect(() => {
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        optimizerCachePath: 'foo/bar',
      });
    }).toThrowErrorMatchingInlineSnapshot(`"optimizerCachePath must be absolute"`);
  });

  it('applies defaults', () => {
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "dist": false,
        "maxWorkerCount": 2,
        "optimizerCachePath": <absolute path>/data/.kbn-optimizer-cache.json,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/plugins,
          <absolute path>/x-pack/plugins,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        optimizerCachePath: false,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "dist": false,
        "maxWorkerCount": 2,
        "optimizerCachePath": false,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/plugins,
          <absolute path>/x-pack/plugins,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        examples: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "dist": false,
        "maxWorkerCount": 2,
        "optimizerCachePath": <absolute path>/data/.kbn-optimizer-cache.json,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/plugins,
          <absolute path>/x-pack/plugins,
          <absolute path>/examples,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        oss: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "dist": false,
        "maxWorkerCount": 2,
        "optimizerCachePath": <absolute path>/data/.kbn-optimizer-cache.json,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/plugins,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [Path.resolve(REPO_ROOT, 'x/y/z'), '/outside/of/repo'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "dist": false,
        "maxWorkerCount": 2,
        "optimizerCachePath": <absolute path>/data/.kbn-optimizer-cache.json,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/x/y/z,
          "/outside/of/repo",
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "watch": false,
      }
    `);
  });
});

/**
 * NOTE: this method is basically just calling others, so we're mocking out the return values
 * of each function with a Symbol, including the return values of OptimizerConfig.parseOptions
 * and just making sure that the arguments are coming from where we expect
 */
describe('OptimizerConfig::create()', () => {
  const assignBundlesToWorkers: jest.Mock = jest.requireMock('./assign_bundles_to_workers.ts')
    .assignBundlesToWorkers;
  const findNewPlatformPlugins: jest.Mock = jest.requireMock('./new_platform_plugins.ts')
    .findNewPlatformPlugins;
  const OptimizerCache: jest.MockedClass<typeof OC> = jest.requireMock('./optimizer_cache.ts')
    .OptimizerCache;
  const getBundleDefinitions: jest.Mock = jest.requireMock('./get_bundle_definitions.ts')
    .getBundleDefinitions;

  beforeEach(() => {
    if ('mock' in OptimizerConfig.parseOptions) {
      (OptimizerConfig.parseOptions as jest.Mock).mockRestore();
    }

    assignBundlesToWorkers.mockReturnValue([
      { config: Symbol('worker config 1') },
      { config: Symbol('worker config 2') },
    ]);
    findNewPlatformPlugins.mockReturnValue(Symbol('new platform plugins'));
    getBundleDefinitions.mockReturnValue(Symbol('bundle definitions'));

    jest.spyOn(OptimizerConfig, 'parseOptions').mockImplementation((): any => ({
      optimizerCachePath: Symbol('parsed bundle metadata path'),
      dist: Symbol('parsed dist'),
      maxWorkerCount: Symbol('parsed max worker count'),
      pluginPaths: Symbol('parsed plugin paths'),
      pluginScanDirs: Symbol('parsed plugin scan dirs'),
      repoRoot: Symbol('parsed repo root'),
      watch: Symbol('parsed watch'),
    }));
  });

  it('passes parsed options to findNewPlatformPlugins, OptimizerCache, getBundleDefinitions, and assignBundlesToWorkers', () => {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
    });

    expect(config).toMatchInlineSnapshot(`
      OptimizerConfig {
        "bundles": Symbol(bundle definitions),
        "cache": OptimizerCache {
          "getBundleModuleCount": [MockFunction],
          "getState": [MockFunction],
          "saveBundleModuleCount": [MockFunction],
          "setState": [MockFunction],
        },
        "watch": Symbol(parsed watch),
        "workers": Array [
          Symbol(worker config 1),
          Symbol(worker config 2),
        ],
      }
    `);

    expect(findNewPlatformPlugins.mock).toMatchInlineSnapshot(`
      Object {
        "calls": Array [
          Array [
            Symbol(parsed plugin scan dirs),
            Symbol(parsed plugin paths),
          ],
        ],
        "instances": Array [
          [Window],
        ],
        "invocationCallOrder": Array [
          8,
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Symbol(new platform plugins),
          },
        ],
      }
    `);

    expect(OptimizerCache.mock).toMatchInlineSnapshot(`
      Object {
        "calls": Array [
          Array [
            Symbol(parsed bundle metadata path),
          ],
        ],
        "instances": Array [
          OptimizerCache {
            "getBundleModuleCount": [MockFunction],
            "getState": [MockFunction],
            "saveBundleModuleCount": [MockFunction],
            "setState": [MockFunction],
          },
        ],
        "invocationCallOrder": Array [
          9,
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);

    expect(getBundleDefinitions.mock).toMatchInlineSnapshot(`
      Object {
        "calls": Array [
          Array [
            Symbol(new platform plugins),
            Symbol(parsed repo root),
          ],
        ],
        "instances": Array [
          [Window],
        ],
        "invocationCallOrder": Array [
          10,
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Symbol(bundle definitions),
          },
        ],
      }
    `);

    expect(assignBundlesToWorkers.mock).toMatchInlineSnapshot(`
      Object {
        "calls": Array [
          Array [
            Object {
              "bundles": Symbol(bundle definitions),
              "cache": OptimizerCache {
                "getBundleModuleCount": [MockFunction],
                "getState": [MockFunction],
                "saveBundleModuleCount": [MockFunction],
                "setState": [MockFunction],
              },
              "dist": Symbol(parsed dist),
              "maxWorkerCount": Symbol(parsed max worker count),
              "profileWebpack": undefined,
              "repoRoot": Symbol(parsed repo root),
              "watch": Symbol(parsed watch),
            },
          ],
        ],
        "instances": Array [
          [Window],
        ],
        "invocationCallOrder": Array [
          11,
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Array [
              Object {
                "config": Symbol(worker config 1),
              },
              Object {
                "config": Symbol(worker config 2),
              },
            ],
          },
        ],
      }
    `);
  });
});
