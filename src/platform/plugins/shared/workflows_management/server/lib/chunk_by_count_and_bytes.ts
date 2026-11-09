/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Splits items, in order, into chunks of at most `maxCount` items and `maxBytes` bytes.
 * An item larger than `maxBytes` gets a chunk of its own.
 */
export const chunkByCountAndBytes = <T>(
  items: readonly T[],
  {
    maxCount,
    maxBytes,
    getBytes,
  }: { maxCount: number; maxBytes: number; getBytes: (item: T) => number }
): T[][] => {
  const chunks: T[][] = [];
  let chunk: T[] = [];
  let chunkBytes = 0;

  for (const item of items) {
    const bytes = getBytes(item);
    if (chunk.length > 0 && (chunk.length >= maxCount || chunkBytes + bytes > maxBytes)) {
      chunks.push(chunk);
      chunk = [];
      chunkBytes = 0;
    }
    chunk.push(item);
    chunkBytes += bytes;
  }

  if (chunk.length > 0) {
    chunks.push(chunk);
  }
  return chunks;
};
