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
