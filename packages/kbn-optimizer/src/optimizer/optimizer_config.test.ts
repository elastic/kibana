/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/repo-packages');
jest.mock('@kbn/core-ui-settings-common');
jest.mock('./assign_bundles_to_workers');
jest.mock('./kibana_platform_plugins');
jest.mock('./get_plugin_bundles');
jest.mock('./filter_by_id');
jest.mock('./focus_bundles');
jest.mock('../limits');

jest.mock('os', () => {
  return {
    ...jest.requireActual('os'),
    cpus() {
      return ['foo'] as any;
    },
    totalmem() {
      return 64000000000;
    },
    freemem() {
      return 20000000000;
    },
  };
});

jest.mock('v8', () => {
  return {
    ...jest.requireActual('v8'),
    getHeapStatistics() {
      return {
        total_heap_size: 5816320,
        total_heap_size_executable: 262144,
        total_physical_size: 6012928,
        total_available_size: 4341242192,
        used_heap_size: 4930768,
        heap_size_limit: 4345298944,
        malloced_memory: 262320,
        peak_malloced_memory: 571392,
        does_zap_garbage: 0,
        number_of_native_contexts: 2,
        number_of_detached_contexts: 0,
        total_global_handles_size: 8192,
        used_global_handles_size: 3296,
        external_memory: 2209666,
      };
    },
  };
});

import { REPO_ROOT } from '@kbn/repo-info';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { OptimizerConfig, ParsedOptions } from './optimizer_config';
import { parseThemeTags } from '@kbn/core-ui-settings-common';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

beforeEach(() => {
  delete process.env.KBN_OPTIMIZER_MAX_WORKERS;
  delete process.env.KBN_OPTIMIZER_NO_CACHE;
  delete process.env.KBN_OPTIMIZER_THEMES;
  jest.clearAllMocks();
});

describe('OptimizerConfig::parseOptions()', () => {
  it('validates that repoRoot is absolute', () => {
    expect(() =>
      OptimizerConfig.parseOptions({ repoRoot: 'foo/bar' })
    ).toThrowErrorMatchingInlineSnapshot(`"repoRoot must be an absolute path"`);
  });

  it('validates that maxWorkerCount is a number', () => {
    expect(() => {
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        maxWorkerCount: NaN,
      });
    }).toThrowErrorMatchingInlineSnapshot(`"worker count must be a number"`);
  });

  it('defaults to * theme when dist = true', () => {
    OptimizerConfig.parseOptions({
      repoRoot: REPO_ROOT,
      dist: true,
    });

    expect(parseThemeTags).toBeCalledWith('*');
  });

  it('defaults to KBN_OPTIMIZER_THEMES when dist = false', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'foo';

    OptimizerConfig.parseOptions({
      repoRoot: REPO_ROOT,
      dist: false,
    });

    expect(parseThemeTags).toBeCalledWith('foo');
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
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 2,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
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
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 2,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
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
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 2,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": true,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 2,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_MAX_WORKERS = '100';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 100,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '0';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 100,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '1';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 100,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    process.env.KBN_OPTIMIZER_NO_CACHE = '1';
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        cache: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": false,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 100,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
        "watch": false,
      }
    `);

    delete process.env.KBN_OPTIMIZER_NO_CACHE;
    expect(
      OptimizerConfig.parseOptions({
        repoRoot: REPO_ROOT,
        cache: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cache": true,
        "dist": false,
        "filters": Array [],
        "focus": Array [],
        "includeCoreBundle": false,
        "inspectWorkers": false,
        "maxWorkerCount": 100,
        "outputRoot": <absolute path>,
        "pluginSelector": Object {
          "examples": false,
          "parentDirs": undefined,
          "paths": undefined,
          "testPlugins": false,
        },
        "profileWebpack": false,
        "reactVersion": "17",
        "repoRoot": <absolute path>,
        "themeTags": undefined,
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
  const assignBundlesToWorkers: jest.Mock = jest.requireMock(
    './assign_bundles_to_workers'
  ).assignBundlesToWorkers;
  const getPackages: jest.Mock = jest.requireMock('@kbn/repo-packages').getPackages;
  const getPluginPackagesFilter: jest.Mock =
    jest.requireMock('@kbn/repo-packages').getPluginPackagesFilter;
  const toKibanaPlatformPlugin: jest.Mock = jest.requireMock(
    './kibana_platform_plugins'
  ).toKibanaPlatformPlugin;
  const getPluginBundles: jest.Mock = jest.requireMock('./get_plugin_bundles').getPluginBundles;
  const filterById: jest.Mock = jest.requireMock('./filter_by_id').filterById;
  const focusBundles: jest.Mock = jest.requireMock('./focus_bundles').focusBundles;
  const readLimits: jest.Mock = jest.requireMock('../limits').readLimits;

  beforeEach(() => {
    if ('mock' in OptimizerConfig.parseOptions) {
      (OptimizerConfig.parseOptions as jest.Mock).mockRestore();
    }

    assignBundlesToWorkers.mockReturnValue([
      { config: Symbol('worker config 1') },
      { config: Symbol('worker config 2') },
    ]);
    getPackages.mockReturnValue([Symbol('plugin1'), Symbol('plugin2')]);
    getPluginPackagesFilter.mockReturnValue(() => true);
    toKibanaPlatformPlugin.mockImplementation((_, pkg) => pkg);
    getPluginBundles.mockReturnValue([Symbol('bundle1'), Symbol('bundle2')]);
    filterById.mockReturnValue(Symbol('filtered bundles'));
    focusBundles.mockReturnValue(Symbol('focused bundles'));
    readLimits.mockReturnValue(Symbol('limits'));

    jest.spyOn(OptimizerConfig, 'parseOptions').mockImplementation(
      (): {
        [key in keyof ParsedOptions]: any;
      } => ({
        cache: Symbol('parsed cache'),
        dist: Symbol('parsed dist'),
        maxWorkerCount: Symbol('parsed max worker count'),
        repoRoot: Symbol('parsed repo root'),
        outputRoot: Symbol('parsed output root'),
        watch: Symbol('parsed watch'),
        themeTags: Symbol('theme tags'),
        inspectWorkers: Symbol('parsed inspect workers'),
        profileWebpack: Symbol('parsed profile webpack'),
        filters: [],
        focus: [],
        includeCoreBundle: false,
        pluginSelector: Symbol('plugin selector'),
        reactVersion: 17,
      })
    );
  });

  it('passes parsed options to findKibanaPlatformPlugins, getBundles, and assignBundlesToWorkers', () => {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      limitsPath: '/foo/limits.yml',
    });

    expect(config).toMatchInlineSnapshot(`
      OptimizerConfig {
        "bundles": Symbol(focused bundles),
        "cache": Symbol(parsed cache),
        "dist": Symbol(parsed dist),
        "filteredBundles": Symbol(filtered bundles),
        "inspectWorkers": Symbol(parsed inspect workers),
        "maxWorkerCount": Symbol(parsed max worker count),
        "plugins": Array [
          Symbol(plugin1),
          Symbol(plugin2),
        ],
        "profileWebpack": Symbol(parsed profile webpack),
        "reactVersion": 17,
        "repoRoot": Symbol(parsed repo root),
        "themeTags": Symbol(theme tags),
        "watch": Symbol(parsed watch),
      }
    `);

    expect(filterById.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [],
          Symbol(focused bundles),
        ],
      ]
    `);

    expect(getPluginBundles.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            Symbol(plugin1),
            Symbol(plugin2),
          ],
          Symbol(parsed repo root),
          Symbol(parsed output root),
          Symbol(limits),
        ],
      ]
    `);
  });
});
