/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export async function parallelizeBatches<T>(batches: T[][], fn: (item: T) => Promise<void>) {
  for (const batch of batches) {
    // We need to make sure the entire batch has completed before we can move on
    // to the next batch
    await parallelize(batch, fn);
  }
}

export async function parallelize<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 4) {
  if (items.length === 0) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let activePromises = 0;
    const values = items.slice(0);

    async function scheduleItem(item: T) {
      activePromises++;

      try {
        await fn(item);

        activePromises--;

        if (values.length > 0) {
          // We have more work to do, so we schedule the next promise
          scheduleItem(values.shift()!);
        } else if (activePromises === 0) {
          // We have no more values left, and all items have completed, so we've
          // completed all the work.
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    }

    values.splice(0, concurrency).map(scheduleItem);
  });
}
