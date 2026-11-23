/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps over items a few at a time, keeping their order. Sources published as one document per page
 * or per tool need many small fetches, and a bound keeps a large one quick without hammering the
 * vendor's host.
 */
export const mapConcurrently = async <T, R>(
  items: readonly T[],
  map: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const work = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await map(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, work));
  return results;
};
