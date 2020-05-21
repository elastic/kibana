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

export interface Assignment {
  moduleCount: number;
  newBundles: number;
  bundles: Bundle[];
}

/** assign a wrapped bundle to a worker */
const assignBundle = (worker: Assignment, bundle: Bundle) => {
  const moduleCount = bundle.cache.getModuleCount();
  if (moduleCount !== undefined) {
    worker.moduleCount += moduleCount;
  } else {
    worker.newBundles += 1;
  }

  worker.bundles.push(bundle);
};

const times = <T>(n: number, create: (i: number) => T): T[] => {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(create(i));
  }
  return result;
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
export function assignBundlesToWorkers(
  bundles: Bundle[],
  maxActiveWorkers: number,
  targetModulesPerWorker: number
) {
  /**
   * separate the bundles which do and don't have module
   * counts and sort them by [moduleCount, id]
   */
  const bundlesWithCountsDesc = bundles
    .filter(b => b.cache.getModuleCount() !== undefined)
    .sort(
      descending(
        b => b.cache.getModuleCount(),
        b => b.id
      )
    );
  const bundlesWithoutModuleCounts = bundles
    .filter(b => b.cache.getModuleCount() === undefined)
    .sort(descending(b => b.id));

  // sum up the total number of known modules
  const sumOfKnownModuleCount = bundlesWithCountsDesc.reduce(
    (acc, b) => acc + b.cache.getModuleCount()!,
    0
  );

  const workerCount = Math.min(
    bundlesWithCountsDesc.length,
    Math.max(maxActiveWorkers, Math.ceil(sumOfKnownModuleCount / targetModulesPerWorker))
  );

  const knownBundleWorkers = times(
    workerCount,
    (): Assignment => ({
      moduleCount: 0,
      newBundles: 0,
      bundles: [],
    })
  );

  /**
   * assign bundles without module counts to their own workers
   */
  const newBundleWorkers = bundlesWithoutModuleCounts.map(b => {
    const assignment: Assignment = {
      moduleCount: 0,
      newBundles: 0,
      bundles: [],
    };
    assignBundle(assignment, b);
    return assignment;
  });

  /**
   * assign largest bundles to the smallest worker until it is
   * no longer the smallest worker and repeat until all bundles
   * with module counts are assigned
   */
  while (bundlesWithCountsDesc.length) {
    const [smallestWorker, nextSmallestWorker] = knownBundleWorkers.sort(
      ascending(w => w.moduleCount)
    );

    while (!nextSmallestWorker || smallestWorker.moduleCount <= nextSmallestWorker.moduleCount) {
      const bundle = bundlesWithCountsDesc.shift();

      if (!bundle) {
        break;
      }

      assignBundle(smallestWorker, bundle);
    }
  }

  return [...newBundleWorkers, ...knownBundleWorkers].sort(
    descending(
      bundle => bundle.newBundles,
      bundle => bundle.moduleCount
    )
  );
}
