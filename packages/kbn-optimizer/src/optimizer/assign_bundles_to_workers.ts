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

const times = (n: number, fn: () => void) => {
  for (let i = 0; i < n; i++) fn();
};

export class Assignment {
  public moduleCount = 0;
  public newBundles = 0;
  public readonly bundles: Bundle[] = [];

  public addBundle(bundle: Bundle) {
    const moduleCount = bundle.cache.getModuleCount();

    if (moduleCount !== undefined) {
      this.moduleCount += moduleCount;
    } else {
      this.newBundles += 1;
    }

    this.bundles.push(bundle);
  }
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
export function assignBundlesToWorkers(
  bundles: Bundle[],
  maxActiveWorkers: number,
  softMaxModulesPerWorker: number
) {
  /**
   * start with assignments equal to the max active worker limit
   */
  const assignments: Assignment[] = [];
  times(maxActiveWorkers, () => {
    assignments.push(new Assignment());
  });

  /**
   * add bundles without counts to assignments that don't already have new bundles, or create new assignments
   */
  const bundlesWithoutCounts = bundles
    .filter((b) => b.cache.getModuleCount() === undefined)
    .sort(descending((b) => b.id));

  for (const bundle of bundlesWithoutCounts) {
    let assignment = assignments.find((a) => !a.newBundles);
    if (!assignment) {
      assignment = new Assignment();
      assignments.push(assignment);
    }
    assignment.addBundle(bundle);
  }

  /**
   * add bundles with the largest number of modules to the smallest worker
   * until it is no longer the smallest worker and repeat until all bundles
   * with module counts are assigned. If all assignments are over the soft
   * limit add another batch equal to the max active worker count
   */
  const bundlesWithCounts = bundles
    .filter((b) => b.cache.getModuleCount() !== undefined)
    .sort(
      descending(
        (b) => b.cache.getModuleCount(),
        (b) => b.id
      )
    );

  while (bundlesWithCounts.length) {
    const incompleteAssignments = assignments.filter(
      (a) => a.moduleCount < softMaxModulesPerWorker && !a.newBundles
    );

    if (!incompleteAssignments.length) {
      const remainingModuleCount = bundlesWithCounts.reduce(
        (acc, b) => b.cache.getModuleCount()! + acc,
        0
      );
      // add maxActiveWorkers incomplete assignments
      times(Math.ceil(remainingModuleCount / softMaxModulesPerWorker), () => {
        const assignment = new Assignment();
        assignments.push(assignment);
        incompleteAssignments.push(assignment);
      });
    }

    const [smallest, nextSmallest] = incompleteAssignments.sort(ascending((w) => w.moduleCount));

    while (!nextSmallest || smallest.moduleCount <= nextSmallest.moduleCount) {
      const bundle = bundlesWithCounts.shift();

      if (!bundle) {
        break;
      }

      smallest.addBundle(bundle);

      // if adding a bundle to an assignment makes it exceed the max then
      // break so that we recalc incompleteAssignments and potentially create
      // new empty assignments
      if (smallest.moduleCount >= softMaxModulesPerWorker) {
        break;
      }
    }
  }

  return assignments
    .filter((a) => a.bundles.length)
    .sort(
      ascending(
        (bundle) => bundle.moduleCount,
        (bundle) => bundle.newBundles
      )
    );
}
