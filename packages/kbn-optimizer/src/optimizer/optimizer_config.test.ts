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
jest.mock('./kibana_platform_plugins.ts');
jest.mock('./get_plugin_bundles.ts');

import Path from 'path';
import Os from 'os';

import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';

import { OptimizerConfig } from './optimizer_config';

jest.spyOn(Os, 'cpus').mockReturnValue(['foo'] as any);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

beforeEach(() => {
  delete process.env.KBN_OPTIMIZER_MAX_ACTIVE_WORKERS;
  delete process.env.KBN_OPTIMIZER_SOFT_MAX_MODULES_PER_WORKER;
  delete process.env.KBN_OPTIMIZER_NO_CACHE;
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

  it('validates that maxActiveWorkers is a number', () => {
    expect(() => {
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        maxActiveWorkers: NaN,
      });
    }).toThrowErrorMatchingInlineSnapshot(`"max worker count must be a number"`);
  });

  it('validates that softMaxModulesPerWorker is a number', () => {
    expect(() => {
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        softMaxModulesPerWorker: NaN,
      });
    }).toThrowErrorMatchingInlineSnapshot(`"max modules per worker must be a number"`);
  });

  it('applies defaults', () => {
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 2,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/x-pack/plugins,
          <absolute path>/plugins,
          <absolute path>-extra,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        cache: false,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 2,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/x-pack/plugins,
          <absolute path>/plugins,
          <absolute path>-extra,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
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
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 2,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/x-pack/plugins,
          <absolute path>/plugins,
          <absolute path>/examples,
          <absolute path>/x-pack/examples,
          <absolute path>-extra,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
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
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 2,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/src/plugins,
          <absolute path>/plugins,
          <absolute path>-extra,
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
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
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 2,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [
          <absolute path>/x/y/z,
          "/outside/of/repo",
        ],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_MAX_ACTIVE_WORKERS = '100';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 3000,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_SOFT_MAX_MODULES_PER_WORKER = '100';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 100,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '0';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 100,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '1';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 100,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '1';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
        cache: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 100,
        "watch": false,
      }
    `);

    delete process.env.KBN_OPTIMIZER_NO_CACHE;
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        pluginScanDirs: [],
        cache: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxActiveWorkers": 100,
        "pluginPaths": Array [],
        "pluginScanDirs": Array [],
        "profileWebpack": false,
        "repoRoot": <absolute path>,
        "softMaxModulesPerWorker": 100,
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
  const findKibanaPlatformPlugins: jest.Mock = jest.requireMock('./kibana_platform_plugins.ts')
    .findKibanaPlatformPlugins;
  const getPluginBundles: jest.Mock = jest.requireMock('./get_plugin_bundles.ts').getPluginBundles;

  beforeEach(() => {
    if ('mock' in OptimizerConfig.parseOptions) {
      (OptimizerConfig.parseOptions as jest.Mock).mockRestore();
    }

    assignBundlesToWorkers.mockReturnValue([
      { config: Symbol('worker config 1') },
      { config: Symbol('worker config 2') },
    ]);
    findKibanaPlatformPlugins.mockReturnValue(Symbol('new platform plugins'));
    getPluginBundles.mockReturnValue([Symbol('bundle1'), Symbol('bundle2')]);

    jest.spyOn(OptimizerConfig, 'parseOptions').mockImplementation((): any => ({
      cache: Symbol('parsed cache'),
      dist: Symbol('parsed dist'),
      maxActiveWorkers: Symbol('parsed max active workers'),
      softMaxModulesPerWorker: Symbol('parsed target modules per worker'),
      pluginPaths: Symbol('parsed plugin paths'),
      pluginScanDirs: Symbol('parsed plugin scan dirs'),
      repoRoot: Symbol('parsed repo root'),
      watch: Symbol('parsed watch'),
      inspectWorkers: Symbol('parsed inspect workers'),
      profileWebpack: Symbol('parsed profile webpack'),
    }));
  });

  it('passes parsed options to findKibanaPlatformPlugins, getBundles, and assignBundlesToWorkers', () => {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
    });

    expect(config).toMatchInlineSnapshot(`
      OptimizerConfig {
        "bundles": Array [
          Symbol(bundle1),
          Symbol(bundle2),
        ],
        "cache": Symbol(parsed cache),
        "dist": Symbol(parsed dist),
        "inspectWorkers": Symbol(parsed inspect workers),
        "maxActiveWorkers": Symbol(parsed max active workers),
        "plugins": Symbol(new platform plugins),
        "profileWebpack": Symbol(parsed profile webpack),
        "repoRoot": Symbol(parsed repo root),
        "softMaxModulesPerWorker": Symbol(parsed target modules per worker),
        "watch": Symbol(parsed watch),
      }
    `);

    expect(findKibanaPlatformPlugins.mock).toMatchInlineSnapshot(`
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

    expect(getPluginBundles.mock).toMatchInlineSnapshot(`
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
          9,
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Array [
              Symbol(bundle1),
              Symbol(bundle2),
            ],
          },
        ],
      }
    `);
  });
});
