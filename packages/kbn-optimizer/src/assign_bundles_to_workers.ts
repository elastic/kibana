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

import { BundleDefinition, WorkerConfig } from './common';
import { OptimizerCache } from './optimizer_cache';

// helper types used inside getWorkerConfigs so we don't have
// to calculate moduleCounts over and over

export interface Worker extends HasModuleCount {
  newBundles: number;
  config: WorkerConfig;
}

interface WrappedBundleWithCount extends HasModuleCount {
  def: BundleDefinition;
}

interface WrappedBundleWithoutCount {
  moduleCount: undefined;
  def: BundleDefinition;
}

interface HasModuleCount {
  moduleCount: number;
}

type WrappedBundle = WrappedBundleWithCount | WrappedBundleWithoutCount;

/** assign a wrapped bundle to a worker */
const assignBundle = (worker: Worker, { moduleCount, def }: WrappedBundle) => {
  if (moduleCount !== undefined) {
    worker.moduleCount += moduleCount;
  } else {
    worker.newBundles += 1;
  }

  worker.config.bundles.push(def);
};

/** compare items with module counts */
const byModuleCount = (a: HasModuleCount, b: HasModuleCount) => a.moduleCount - b.moduleCount;

/** compare items with module counts in descending order */
const byModuleCountDesc = (a: HasModuleCount, b: HasModuleCount) => byModuleCount(b, a);

export interface Options {
  bundles: BundleDefinition[];
  cache: OptimizerCache;
  maxWorkerCount: number;
  repoRoot: string;
  watch: boolean;
  dist: boolean;
  profileWebpack: boolean;
}

/**
 * Create WorkerConfig objects for each worker we will use to build the bundles.
 *
 * We need to evenly assign bundles to workers so that each worker will have
 * about the same amount of work to do. We do this by tracking the module count
 * of each bundle in the OptimizerCache and determining the overall workload
 * of a worker by the sum of modules it will have to compile for all of its
 * bundles.
 *
 * We only know the module counts after the first build of a new bundle, so
 * when we encounter a bundle without a module count in the cache we just
 * assign them to workers round-robin, starting with the workers which have
 * the smallest number of modules to build.
 */
export function assignBundlesToWorkers(options: Options) {
  const workerCount = Math.min(options.bundles.length, options.maxWorkerCount);
  const workers: Worker[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push({
      moduleCount: 0,
      newBundles: 0,
      config: {
        repoRoot: options.repoRoot,
        watch: options.watch,
        dist: options.dist,
        profileWebpack: options.profileWebpack,
        bundles: [],
      },
    });
  }

  /**
   * wrap all bundles with their module count and sort them by id
   * descending so that subsequent sorting will be deterministic
   * even if we're sorting by module count, which may be the same
   * for two bundles
   */
  const wrappedBundled = options.bundles
    .map(b => ({
      moduleCount: options.cache.getBundleModuleCount(b.id),
      def: b,
    }))
    .sort((a, b) => b.def.id.localeCompare(a.def.id));

  /**
   * separate the bundles which do and don't have module counts
   */
  const bundlesWithCountsDesc = wrappedBundled
    .filter((b): b is WrappedBundleWithCount => b.moduleCount !== undefined)
    .sort(byModuleCountDesc);
  const bundlesWithoutModuleCounts = wrappedBundled.filter(
    (b): b is WrappedBundleWithoutCount => b.moduleCount === undefined
  );

  /**
   * assign largest bundles to the smallest worker until it is
   * no longer the smallest worker and repeat until all bundles
   * with module counts are assigned
   */
  while (bundlesWithCountsDesc.length) {
    const [smallestWorker, nextSmallestWorker] = workers.sort(byModuleCount);

    while (!nextSmallestWorker || smallestWorker.moduleCount <= nextSmallestWorker.moduleCount) {
      const bundle = bundlesWithCountsDesc.shift();

      if (!bundle) {
        break;
      }

      assignBundle(smallestWorker, bundle);
    }
  }

  /**
   * assign bundles without module counts to workers round-robin
   * starting with the smallest workers
   */
  workers.sort(byModuleCount);
  while (bundlesWithoutModuleCounts.length) {
    for (const worker of workers) {
      const bundle = bundlesWithoutModuleCounts.shift();
      if (!bundle) {
        break;
      }
      assignBundle(worker, bundle);
    }
  }

  return workers;
}
