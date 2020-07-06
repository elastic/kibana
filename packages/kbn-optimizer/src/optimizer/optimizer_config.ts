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
import Os from 'os';

import {
  Bundle,
  WorkerConfig,
  CacheableWorkerConfig,
  ThemeTag,
  ThemeTags,
  parseThemeTags,
} from '../common';

import { findKibanaPlatformPlugins, KibanaPlatformPlugin } from './kibana_platform_plugins';
import { getPluginBundles } from './get_plugin_bundles';

function pickMaxWorkerCount(dist: boolean) {
  // don't break if cpus() returns nothing, or an empty array
  const cpuCount = Math.max(Os.cpus()?.length, 1);
  // if we're buiding the dist then we can use more of the system's resources to get things done a little quicker
  const maxWorkers = dist ? cpuCount - 1 : Math.ceil(cpuCount / 3);
  // ensure we always have at least two workers
  return Math.max(maxWorkers, 2);
}

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj) as any) {
    if (!keys.includes(key)) {
      result[key] = value;
    }
  }
  return result as Omit<T, K>;
}

interface Options {
  /** absolute path to root of the repo/build */
  repoRoot: string;
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

  /** include only oss plugins in default scan dirs */
  oss?: boolean;
  /** include examples in default scan dirs */
  examples?: boolean;
  /** absolute paths to specific plugins that should be built */
  pluginPaths?: string[];
  /** absolute paths to directories that should be built, overrides the default scan dirs */
  pluginScanDirs?: string[];
  /** absolute paths that should be added to the default scan dirs */
  extraPluginScanDirs?: string[];

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
}

interface ParsedOptions {
  repoRoot: string;
  watch: boolean;
  maxWorkerCount: number;
  profileWebpack: boolean;
  cache: boolean;
  dist: boolean;
  pluginPaths: string[];
  pluginScanDirs: string[];
  inspectWorkers: boolean;
  includeCoreBundle: boolean;
  themeTags: ThemeTags;
}

export class OptimizerConfig {
  static parseOptions(options: Options): ParsedOptions {
    const watch = !!options.watch;
    const oss = !!options.oss;
    const dist = !!options.dist;
    const examples = !!options.examples;
    const profileWebpack = !!options.profileWebpack;
    const inspectWorkers = !!options.inspectWorkers;
    const cache = options.cache !== false && !process.env.KBN_OPTIMIZER_NO_CACHE;
    const includeCoreBundle = !!options.includeCoreBundle;

    const repoRoot = options.repoRoot;
    if (!Path.isAbsolute(repoRoot)) {
      throw new TypeError('repoRoot must be an absolute path');
    }

    /**
     * BEWARE: this needs to stay roughly synchronized with
     * `src/core/server/config/env.ts` which determines which paths
     * should be searched for plugins to load
     */
    const pluginScanDirs = options.pluginScanDirs || [
      Path.resolve(repoRoot, 'src/plugins'),
      ...(oss ? [] : [Path.resolve(repoRoot, 'x-pack/plugins')]),
      Path.resolve(repoRoot, 'plugins'),
      ...(examples ? [Path.resolve('examples'), Path.resolve('x-pack/examples')] : []),
      Path.resolve(repoRoot, '../kibana-extra'),
    ];
    if (!pluginScanDirs.every((p) => Path.isAbsolute(p))) {
      throw new TypeError('pluginScanDirs must all be absolute paths');
    }

    for (const extraPluginScanDir of options.extraPluginScanDirs || []) {
      if (!Path.isAbsolute(extraPluginScanDir)) {
        throw new TypeError('extraPluginScanDirs must all be absolute paths');
      }
      pluginScanDirs.push(extraPluginScanDir);
    }

    const pluginPaths = options.pluginPaths || [];
    if (!pluginPaths.every((s) => Path.isAbsolute(s))) {
      throw new TypeError('pluginPaths must all be absolute paths');
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

    return {
      watch,
      dist,
      repoRoot,
      maxWorkerCount,
      profileWebpack,
      cache,
      pluginScanDirs,
      pluginPaths,
      inspectWorkers,
      includeCoreBundle,
      themeTags,
    };
  }

  static create(inputOptions: Options) {
    const options = OptimizerConfig.parseOptions(inputOptions);
    const plugins = findKibanaPlatformPlugins(options.pluginScanDirs, options.pluginPaths);
    const bundles = [
      ...(options.includeCoreBundle
        ? [
            new Bundle({
              type: 'entry',
              id: 'core',
              publicDirNames: ['public', 'public/utils'],
              sourceRoot: options.repoRoot,
              contextDir: Path.resolve(options.repoRoot, 'src/core'),
              outputDir: Path.resolve(options.repoRoot, 'src/core/target/public'),
            }),
          ]
        : []),
      ...getPluginBundles(plugins, options.repoRoot),
    ];

    return new OptimizerConfig(
      bundles,
      options.cache,
      options.watch,
      options.inspectWorkers,
      plugins,
      options.repoRoot,
      options.maxWorkerCount,
      options.dist,
      options.profileWebpack,
      options.themeTags
    );
  }

  constructor(
    public readonly bundles: Bundle[],
    public readonly cache: boolean,
    public readonly watch: boolean,
    public readonly inspectWorkers: boolean,
    public readonly plugins: KibanaPlatformPlugin[],
    public readonly repoRoot: string,
    public readonly maxWorkerCount: number,
    public readonly dist: boolean,
    public readonly profileWebpack: boolean,
    public readonly themeTags: ThemeTags
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
