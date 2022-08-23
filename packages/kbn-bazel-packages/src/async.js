/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 *
 * @template T
 * @template T2
 * @param {(v: T) => Promise<T2>} fn
 * @param {T} item
 * @returns {Promise<PromiseSettledResult<T2>>}
 */
const settle = async (fn, item) => {
  const [result] = await Promise.allSettled([(async () => fn(item))()]);
  return result;
};

/**
 * @template T
 * @template T2
 * @param {Array<T>} source
 * @param {number} limit
 * @param {(v: T) => Promise<T2>} mapFn
 * @returns {Promise<T2[]>}
 */
function asyncMapWithLimit(source, limit, mapFn) {
  return new Promise((resolve, reject) => {
    if (limit < 1) {
      reject(new Error('invalid limit, must be greater than 0'));
      return;
    }

    let failed = false;
    let inProgress = 0;
    const queue = [...source.entries()];

    /** @type {T2[]} */
    const results = new Array(source.length);

    /**
     * this is run for each item, manages the inProgress state,
     * calls the mapFn with that item, writes the map result to
     * the result array, and calls runMore() after each item
     * completes to either start another item or resolve the
     * returned promise.
     *
     * @param {number} index
     * @param {T} item
     */
    function run(index, item) {
      inProgress += 1;
      settle(mapFn, item).then((result) => {
        inProgress -= 1;

        if (failed) {
          return;
        }

        if (result.status === 'fulfilled') {
          results[index] = result.value;
          runMore();
          return;
        }

        // when an error occurs we update the state to prevent
        // holding onto old results and ignore future results
        // from in-progress promises
        failed = true;
        results.length = 0;
        reject(result.reason);
      });
    }

    /**
     * If there is work in the queue, schedule it, if there isn't
     * any work to be scheduled and there isn't anything in progress
     * then we're done. This function is called every time a mapFn
     * promise resolves and once after initialization
     */
    function runMore() {
      if (!queue.length) {
        if (inProgress === 0) {
          resolve(results);
        }

        return;
      }

      while (inProgress < limit) {
        const entry = queue.shift();
        if (!entry) {
          break;
        }

        run(...entry);
      }
    }

    runMore();
  });
}

module.exports = { asyncMapWithLimit };
