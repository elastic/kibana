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

import { Bundle, descending, ascending } from '../common';

// helper types used inside getWorkerConfigs so we don't have
// to calculate moduleCounts over and over

export interface Assignments {
  moduleCount: number;
  newBundles: number;
  bundles: Bundle[];
}

/** assign a wrapped bundle to a worker */
const assignBundle = (worker: Assignments, bundle: Bundle) => {
  const moduleCount = bundle.cache.getModuleCount();
  if (moduleCount !== undefined) {
    worker.moduleCount += moduleCount;
  } else {
    worker.newBundles += 1;
  }

  worker.bundles.push(bundle);
};

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
export function assignBundlesToWorkers(bundles: Bundle[], maxWorkerCount: number) {
  const workerCount = Math.min(bundles.length, maxWorkerCount);
  const workers: Assignments[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push({
      moduleCount: 0,
      newBundles: 0,
      bundles: [],
    });
  }

  /**
   * separate the bundles which do and don't have module
   * counts and sort them by [moduleCount, id]
   */
  const bundlesWithCountsDesc = bundles
    .filter((b) => b.cache.getModuleCount() !== undefined)
    .sort(
      descending(
        (b) => b.cache.getModuleCount(),
        (b) => b.id
      )
    );
  const bundlesWithoutModuleCounts = bundles
    .filter((b) => b.cache.getModuleCount() === undefined)
    .sort(descending((b) => b.id));

  /**
   * assign largest bundles to the smallest worker until it is
   * no longer the smallest worker and repeat until all bundles
   * with module counts are assigned
   */
  while (bundlesWithCountsDesc.length) {
    const [smallestWorker, nextSmallestWorker] = workers.sort(ascending((w) => w.moduleCount));

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
  workers.sort(ascending((w) => w.moduleCount));
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
