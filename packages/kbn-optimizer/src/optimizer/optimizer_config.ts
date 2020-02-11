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

import { Bundle, WorkerConfig } from '../common';

import { findKibanaPlatformPlugins, KibanaPlatformPlugin } from './kibana_platform_plugins';
import { getBundles } from './get_bundles';

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

    const repoRoot = options.repoRoot;
    if (!Path.isAbsolute(repoRoot)) {
      throw new TypeError('repoRoot must be an absolute path');
    }

    /**
     * BEWARE: this needs to stay roughly synchronized with
     * `src/core/server/config/env.ts` which determins which paths
     * should be searched for plugins to load
     */
    const pluginScanDirs = options.pluginScanDirs || [
      Path.resolve(repoRoot, 'src/plugins'),
      ...(oss ? [] : [Path.resolve(repoRoot, 'x-pack/plugins')]),
      Path.resolve(repoRoot, 'plugins'),
      ...(examples ? [Path.resolve('examples')] : []),
      Path.resolve(repoRoot, '../kibana-extra'),
    ];
    if (!pluginScanDirs.every(p => Path.isAbsolute(p))) {
      throw new TypeError('pluginScanDirs must all be absolute paths');
    }

    for (const extraPluginScanDir of options.extraPluginScanDirs || []) {
      if (!Path.isAbsolute(extraPluginScanDir)) {
        throw new TypeError('extraPluginScanDirs must all be absolute paths');
      }
      pluginScanDirs.push(extraPluginScanDir);
    }

    const pluginPaths = options.pluginPaths || [];
    if (!pluginPaths.every(s => Path.isAbsolute(s))) {
      throw new TypeError('pluginPaths must all be absolute paths');
    }

    const maxWorkerCount = process.env.KBN_OPTIMIZER_MAX_WORKERS
      ? parseInt(process.env.KBN_OPTIMIZER_MAX_WORKERS, 10)
      : options.maxWorkerCount ?? Math.max(Math.ceil(Math.max(Os.cpus()?.length, 1) / 3), 2);
    if (typeof maxWorkerCount !== 'number' || !Number.isFinite(maxWorkerCount)) {
      throw new TypeError('worker count must be a number');
    }

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
    };
  }

  static create(inputOptions: Options) {
    const options = OptimizerConfig.parseOptions(inputOptions);
    const plugins = findKibanaPlatformPlugins(options.pluginScanDirs, options.pluginPaths);
    const bundles = getBundles(plugins, options.repoRoot);

    return new OptimizerConfig(
      bundles,
      options.cache,
      options.watch,
      options.inspectWorkers,
      plugins,
      options.repoRoot,
      options.maxWorkerCount,
      options.dist,
      options.profileWebpack
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
    public readonly profileWebpack: boolean
  ) {}

  getWorkerConfig(optimizerCacheKey: unknown): WorkerConfig {
    return {
      cache: this.cache,
      dist: this.dist,
      profileWebpack: this.profileWebpack,
      repoRoot: this.repoRoot,
      watch: this.watch,
      optimizerCacheKey,
      browserslistEnv: this.dist ? 'production' : process.env.BROWSERSLIST_ENV || 'dev',
    };
  }
}
