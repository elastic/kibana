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

import { findNewPlatformPlugins } from './new_platform_plugins';
import { BundleDefinition, WorkerConfig } from './common';
import { OptimizerCache } from './optimizer_cache';
import { assignBundlesToWorkers } from './assign_bundles_to_workers';
import { getBundleDefinitions } from './get_bundle_definitions';

interface Options {
  /** absolute path to root of the repo/build */
  repoRoot: string;
  /** enable to run the optimizer in watch mode */
  watch?: boolean;
  /** the maximum number of workers that will be created */
  maxWorkerCount?: number;
  /** absolute path to the file where the optimizer cache will be written */
  optimizerCachePath?: string | false;
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
  /** absolute paths to directories that should be built, overrides the default scan dires */
  pluginScanDirs?: string[];
  /** absolute paths that should be added to the default scan dirs */
  extraPluginScanDirs?: string[];
}

interface ParsedOptions {
  repoRoot: string;
  watch: boolean;
  maxWorkerCount: number;
  profileWebpack: boolean;
  optimizerCachePath: string | false;
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

    const repoRoot = options.repoRoot;
    if (!Path.isAbsolute(repoRoot)) {
      throw new TypeError('repoRoot must be an absolute path');
    }

    const pluginScanDirs = options.pluginScanDirs || [
      Path.resolve(repoRoot, 'src/plugins'),
      Path.resolve(repoRoot, 'plugins'),
      ...(oss ? [] : [Path.resolve(repoRoot, 'x-pack/plugins')]),
      ...(examples ? [Path.resolve('examples')] : []),
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

    const maxWorkerCount =
      options.maxWorkerCount ?? Math.max(Math.ceil(Math.max(Os.cpus()?.length, 1) / 3), 2);
    if (typeof maxWorkerCount !== 'number' || !Number.isFinite(maxWorkerCount)) {
      throw new TypeError('worker count must be a number');
    }

    const optimizerCachePath =
      options.optimizerCachePath === false
        ? false
        : options.optimizerCachePath ||
          Path.resolve(options.repoRoot, 'data/.kbn-optimizer-cache.json');
    if (optimizerCachePath && !Path.isAbsolute(optimizerCachePath)) {
      throw new TypeError('optimizerCachePath must be absolute');
    }

    return {
      watch,
      dist,
      repoRoot,
      maxWorkerCount,
      profileWebpack,
      optimizerCachePath,
      pluginScanDirs,
      pluginPaths,
      inspectWorkers,
    };
  }

  static create(inputOptions: Options) {
    const options = OptimizerConfig.parseOptions(inputOptions);

    const plugins = findNewPlatformPlugins(options.pluginScanDirs, options.pluginPaths);

    const cache = new OptimizerCache(options.optimizerCachePath);

    const bundles = getBundleDefinitions(plugins, options.repoRoot);

    const workers = assignBundlesToWorkers({
      bundles,
      cache,
      maxWorkerCount: options.maxWorkerCount,
      repoRoot: options.repoRoot,
      watch: options.watch,
      dist: options.dist,
      profileWebpack: options.profileWebpack,
    });

    return new OptimizerConfig(
      cache,
      bundles,
      workers.map(w => w.config),
      options.watch,
      options.inspectWorkers
    );
  }

  constructor(
    public readonly cache: OptimizerCache,
    public readonly bundles: BundleDefinition[],
    public readonly workers: WorkerConfig[],
    public readonly watch: boolean,
    public readonly inspectWorkers: boolean
  ) {}
}
