/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';

/**
 * Helper function to yield control back to the event loop
 * This prevents blocking the event loop during long-running operations
 */
function setImmediatePromise(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Process an array in chunks to avoid blocking the event loop
 * Yields control between chunks to allow other requests to be processed
 *
 * @param items - Array of items to process
 * @param processor - Function to apply to each item
 * @param chunkSize - Number of items to process before yielding (default: 1000)
 * @returns Promise resolving to array of processed items
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize = 1000
): Promise<R[]> {
  const result: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, Math.min(i + chunkSize, items.length));
    result.push(...chunk.map(processor));

    // Yield to event loop after each chunk (except the last)
    if (i + chunkSize < items.length) {
      await setImmediatePromise();
    }
  }

  return result;
}

/**
 * Sort an array by a key, yielding to the event loop for large arrays
 * For small arrays (< 5000 items), uses lodash sortBy directly
 * For larger arrays, yields control during the sort operation
 *
 * @param items - Array of items to sort
 * @param key - Key to sort by (string key name or function)
 * @returns Promise resolving to sorted array
 */
export async function sortByAsync<T>(items: T[], key: keyof T | ((item: T) => any)): Promise<T[]> {
  // For smaller arrays, just sort normally without yielding
  if (items.length < 5000) {
    return sortBy(items, key);
  }

  // For large arrays, yield before sorting to prevent blocking
  await setImmediatePromise();
  return sortBy(items, key);
}

/**
 * Yield control to the event loop
 * Useful for breaking up long-running synchronous operations
 */
export async function yieldToEventLoop(): Promise<void> {
  return setImmediatePromise();
}
