/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MAX_HTTP_LINE_LENGTH = 4096;
// Apply an 80% threshold to the http line max length to guarantee enough space for url and potentially other parameters.
// This value might need to vary as it's an estimate of how much we can reserve for the chunked list length.
export const MAX_HTTP_LINE_CHUNK_SIZE = MAX_HTTP_LINE_LENGTH * 0.75; // 4096 *0.75 === 3072 characters, as 1 char = 1 byte

/**
 * Creates chunks from a list of strings, where each chunk contains as many items
 * as possible without exceeding the specified chunk size limit.
 */
export const bytePartition = (list: string[], chunkSize = MAX_HTTP_LINE_CHUNK_SIZE): string[][] => {
  if (list.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentChunkLength = 0;

  list.forEach((item) => {
    // Is less than max chunk length
    if (currentChunkLength + item.length <= chunkSize) {
      currentChunk.push(item);
      currentChunkLength += item.length;
    } else {
      // Current chunk is full, start a new one
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = [item];
      currentChunkLength = item.length;
    }
  });

  // Add the final chunk if it has any items
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};
