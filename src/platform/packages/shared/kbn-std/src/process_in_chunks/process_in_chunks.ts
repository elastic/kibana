/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepMerge from 'deepmerge';

type CallbackFn<TResult> = (chunk: string[], id: number) => Promise<TResult>;

const MAX_HTTP_LINE_LENGTH = 4096;
// Apply an 80% threshold to the http line max length to guarantee enough space for url and potentially other parameters.
// This value might need to vary as it's an estimate of how much we can reserve for the chunked list length.
export const MAX_HTTP_LINE_CHUNK_SIZE = MAX_HTTP_LINE_LENGTH * 0.75; // 4096 *0.75 === 3072 characters, as 1 char = 1 byte

/**
 * This process takes a list of strings (for this use case, we'll pass it a list of data streams), and does the following steps:
 * 1. Create chunks from the original list. Each chunk will contain as many items until their summed length hits the limit.
 * 2. Provide each chunk in parallel to the chunkExecutor callback and resolve the result, which for our use case performs HTTP requests for data stream stats.
 * 3. Deep merge the result of each response into the same data structure, which is defined by the first item in the list.
 * 4. Once all chunks are processed, return the merged result.
 */
export const processInChunks = async <TResult>(
  list: string[],
  chunkExecutor: CallbackFn<TResult>,
  options: { chunkSize: number } = { chunkSize: MAX_HTTP_LINE_CHUNK_SIZE }
): Promise<TResult> => {
  const { chunkSize } = options;

  const chunks = createChunks(list, chunkSize);

  const chunkResults = await Promise.all(chunks.map(chunkExecutor));

  return chunkResults.reduce((result, chunkResult) => deepMerge(result, chunkResult));
};

/**
 * Support functions for processInChunks
 */

/**
 * Creates chunks from a list of strings, where each chunk contains as many items
 * as possible without exceeding the specified chunk size limit.
 */
const createChunks = (list: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];

  list.forEach((item) => {
    if (isLessThanMaxChunkLength(currentChunk, item, chunkSize)) {
      currentChunk.push(item);
    } else {
      // Current chunk is full, start a new one
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = [item];
    }
  });

  // Add the final chunk if it has any items
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const isLessThanMaxChunkLength = (
  chunk: string[],
  currentItem: string,
  chunkSize: number
): boolean => {
  const totalLength = [...chunk, currentItem].join().length;
  return totalLength <= chunkSize; // Allow the chunk until it exceeds the max chunk length
};
