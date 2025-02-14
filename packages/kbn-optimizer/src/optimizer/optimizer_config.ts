/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Os from 'os';
import { getPackages, getPluginPackagesFilter, type PluginSelector } from '@kbn/repo-packages';
import { ThemeTag, ThemeTags, parseThemeTags } from '@kbn/core-ui-settings-common';

import { Bundle, WorkerConfig, CacheableWorkerConfig, omit } from '../common';

import { toKibanaPlatformPlugin, KibanaPlatformPlugin } from './kibana_platform_plugins';
import { getPluginBundles } from './get_plugin_bundles';
import { filterById } from './filter_by_id';
import { focusBundles } from './focus_bundles';
import { readLimits } from '../limits';

export interface Limits {
  pageLoadAssetSize?: {
    [id: string]: number | undefined;
  };
}

interface SystemInfo {
  cpuCount: number;
}

function getSystemInfo(): SystemInfo {
  // collects useful system information for resource usage calculations
  const cpuCount = Math.max(Os.cpus()?.length ?? 0, 1);

  return { cpuCount };
}

const pickMaxWorkerCount = (dist: boolean) => {
  const isDist = dist;
  const isCI = !!process.env.CI;
  const isUseMaxAvailableResources = !!process.env.KBN_OPTIMIZER_USE_MAX_AVAILABLE_RESOURCES;
  const minWorkers = 2;
  const { cpuCount } = getSystemInfo();
  const maxWorkers = Math.max(cpuCount - 1, minWorkers);

  // In case we get this env var set, just use max workers and avoid any kind of
  // resource balance according to memory and cpu
  if (isUseMaxAvailableResources) {
    return maxWorkers;
  }

  // Start calculating base worker count
  let workerCount;
  if (isDist && isCI) {
    // For CI dist builds, start with most available resources
    workerCount = maxWorkers;
  } else if (isDist) {
    // For local dist builds, start with 80% of resources but leaving some headroom
    workerCount = Math.max(Math.floor(cpuCount * 0.8), 2);
  } else {
    // For regular local builds, start with fewer resources of 50%
    workerCount = Math.max(Math.floor(cpuCount * 0.5), 2);
  }

  // Adjust by the ratio workerCount to maxWorkers.
  // If it is lower or equal to 50% it adds an extra worker
  // so the available resources are better used
  const ratioWorkerCountToMaxWorkers = 1 - workerCount / maxWorkers;
  if (ratioWorkerCountToMaxWorkers >= 0.5) {
    workerCount = Math.min(workerCount + 1, cpuCount);
  }

  // Make sure we respect min and max worker limits
  workerCount = Math.max(workerCount, minWorkers);
  workerCount = Math.min(workerCount, maxWorkers);

  return workerCount;
};

interface Options {
  /** absolute path to root of the repo/build */
  repoRoot: string;
  /**
   * absolute path to the root directory where output should be written to. This
   * defaults to the repoRoot but can be customized to write output somewhere else.
   *
   * This is how we write output to the build directory in the Kibana build tasks.
   */
  outputRoot?: string;
  /** enable to run the optimizer in watch mode */
  watch?: boolean;
  /** the maximum number of workers that will be created */
  maxWorkerCount?: number;
  /** set to false to disabling writing/reading of caches */
  cache?: boolean;
  /** build assets suitable for use in the distributable */
  dist?: boolean;
  /** enable webpack profiling, writes stats.json files to the root of each plugin's output dir */
  profileWebpack?: boolean;
  /** set to true to inspecting workers when the parent process is being inspected */
  inspectWorkers?: boolean;

  /** include examples in default scan dirs */
  examples?: boolean;
  /** discover and build test plugins along with the standard plugins */
  testPlugins?: boolean;
  /** absolute paths to specific plugins which should be built */
  pluginPaths?: string[];
  /** absolute paths to directories, any plugins in these directories will be built */
  pluginScanDirs?: string[];

  /**
   * array of comma separated patterns that will be matched against bundle ids.
   * bundles will only be built if they match one of the specified patterns.
   * `*` can exist anywhere in each pattern and will match anything, `!` inverts the pattern
   *
   * examples:
   *  --filter foo --filter bar # [foo, bar], excludes [foobar]
   *  --filter foo,bar # [foo, bar], excludes [foobar]
   *  --filter foo* # [foo, foobar], excludes [bar]
   *  --filter f*r # [foobar], excludes [foo, bar]
   */
  filter?: string[];

  /**
   * behaves just like filter, but includes required bundles and plugins of the
   * listed bundle ids. Filters only apply to bundles selected by focus
   */
  focus?: string[];

  /** flag that causes the core bundle to be built along with plugins */
  includeCoreBundle?: boolean;

  /**
   * style themes that sass files will be converted to, the correct style will be
   * loaded in the browser automatically by checking the global `__kbnThemeTag__`.
   * Specifying additional styles increases build time.
   *
   * Defaults:
   *  - "*" when building the dist
   *  - comma separated list of themes in the `KBN_OPTIMIZER_THEMES` env var
   *  - "k7light"
   */
  themes?: ThemeTag | '*' | ThemeTag[];

  /** path to a limits.yml file that should be used to inform ci-stats of metric limits */
  limitsPath?: string;
}

export interface ParsedOptions {
  repoRoot: string;
  outputRoot: string;
  watch: boolean;
  maxWorkerCount: number;
  profileWebpack: boolean;
  cache: boolean;
  dist: boolean;
  filters: string[];
  focus: string[];
  inspectWorkers: boolean;
  includeCoreBundle: boolean;
  themeTags: ThemeTags;
  pluginSelector: PluginSelector;
  reactVersion: string;
}

export class OptimizerConfig {
  static parseOptions(options: Options): ParsedOptions {
    const watch = !!options.watch;
    const dist = !!options.dist;
    const examples = !!options.examples;
    const profileWebpack = !!options.profileWebpack;
    const inspectWorkers = !!options.inspectWorkers;
    const testPlugins = !!options.testPlugins;
    const cache = options.cache !== false && !process.env.KBN_OPTIMIZER_NO_CACHE;
    const includeCoreBundle = !!options.includeCoreBundle;
    const filters = options.filter || [];
    const focus = options.focus || [];
    const reactVersion = process.env.REACT_18 ? '18' : '17';

    const repoRoot = options.repoRoot;
    if (!Path.isAbsolute(repoRoot)) {
      throw new TypeError('repoRoot must be an absolute path');
    }

    const outputRoot = options.outputRoot ?? repoRoot;
    if (!Path.isAbsolute(outputRoot)) {
      throw new TypeError('outputRoot must be an absolute path');
    }

    const maxWorkerCount = process.env.KBN_OPTIMIZER_MAX_WORKERS
      ? parseInt(process.env.KBN_OPTIMIZER_MAX_WORKERS, 10)
      : options.maxWorkerCount ?? pickMaxWorkerCount(dist);
    if (typeof maxWorkerCount !== 'number' || !Number.isFinite(maxWorkerCount)) {
      throw new TypeError('worker count must be a number');
    }

    const themeTags = parseThemeTags(
      options.themes || (dist ? '*' : process.env.KBN_OPTIMIZER_THEMES)
    );

    const pluginPaths = options.pluginPaths;
    if (
      pluginPaths !== undefined &&
      !(Array.isArray(pluginPaths) && pluginPaths.every((p) => typeof p === 'string'))
    ) {
      throw new TypeError('pluginPaths must be an array of strings or undefined');
    }
    const pluginScanDirs = options.pluginScanDirs;
    if (
      pluginScanDirs !== undefined &&
      !(Array.isArray(pluginScanDirs) && pluginScanDirs.every((p) => typeof p === 'string'))
    ) {
      throw new TypeError('pluginScanDirs must be an array of strings or undefined');
    }

    return {
      watch,
      dist,
      repoRoot,
      outputRoot,
      maxWorkerCount,
      profileWebpack,
      reactVersion,
      cache,
      filters,
      focus,
      inspectWorkers,
      includeCoreBundle,
      themeTags,
      pluginSelector: {
        examples,
        testPlugins,
        paths: pluginPaths,
        parentDirs: pluginScanDirs,
      },
    };
  }

  static create(inputOptions: Options) {
    const limits = inputOptions.limitsPath ? readLimits(inputOptions.limitsPath) : {};
    const options = OptimizerConfig.parseOptions(inputOptions);
    const plugins = getPackages(options.repoRoot)
      .filter(getPluginPackagesFilter(options.pluginSelector))
      .map((pkg) => toKibanaPlatformPlugin(options.repoRoot, pkg));

    const bundles = [
      ...(options.includeCoreBundle
        ? [
            new Bundle({
              type: 'entry',
              id: 'core',
              sourceRoot: options.repoRoot,
              contextDir: Path.resolve(options.repoRoot, 'src/core'),
              outputDir: Path.resolve(options.outputRoot, 'src/core/target/public'),
              pageLoadAssetSizeLimit: limits.pageLoadAssetSize?.core,
              remoteInfo: {
                pkgId: '@kbn/core',
                targets: ['public'],
              },
              ignoreMetrics: false,
            }),
          ]
        : []),
      ...getPluginBundles(plugins, options.repoRoot, options.outputRoot, limits),
    ];

    const focusedBundles = focusBundles(options.focus, bundles);
    const filteredBundles = filterById(options.filters, focusedBundles);

    return new OptimizerConfig(
      focusedBundles,
      filteredBundles,
      options.cache,
      options.watch,
      options.inspectWorkers,
      plugins,
      options.repoRoot,
      options.maxWorkerCount,
      options.dist,
      options.profileWebpack,
      options.themeTags,
      options.reactVersion
    );
  }

  constructor(
    public readonly bundles: Bundle[],
    public readonly filteredBundles: Bundle[],
    public readonly cache: boolean,
    public readonly watch: boolean,
    public readonly inspectWorkers: boolean,
    public readonly plugins: KibanaPlatformPlugin[],
    public readonly repoRoot: string,
    public readonly maxWorkerCount: number,
    public readonly dist: boolean,
    public readonly profileWebpack: boolean,
    public readonly themeTags: ThemeTags,
    public readonly reactVersion: string
  ) {}

  getWorkerConfig(optimizerCacheKey: unknown): WorkerConfig {
    return {
      cache: this.cache,
      dist: this.dist,
      profileWebpack: this.profileWebpack,
      repoRoot: this.repoRoot,
      watch: this.watch,
      optimizerCacheKey,
      themeTags: this.themeTags,
      browserslistEnv: this.dist ? 'production' : process.env.BROWSERSLIST_ENV || 'dev',
      reactVersion: this.reactVersion,
    };
  }

  getCacheableWorkerConfig(): CacheableWorkerConfig {
    return omit(this.getWorkerConfig('♻'), [
      // these config options don't change the output of the bundles, so
      // should not invalidate caches when they change
      'watch',
      'profileWebpack',
      'cache',
    ]);
  }
}
