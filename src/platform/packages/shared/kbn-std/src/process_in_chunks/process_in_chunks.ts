/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, OperatorFunction, from, lastValueFrom, mergeMap, reduce } from 'rxjs';
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
 * 4. Once the observable used for these steps complete, we get the last value and returns it.
 */
export const processInChunks = <TResult>(
  list: string[],
  chunkExecutor: CallbackFn<TResult>,
  options: { chunkSize: number } = { chunkSize: MAX_HTTP_LINE_CHUNK_SIZE }
) => {
  const { chunkSize } = options;

  const result$ = from(list).pipe(
    bufferUntil((chunk, currentItem) => isLessThanMaxChunkLength(chunk, currentItem, chunkSize)),
    mergeMap((chunk, id) => from(chunkExecutor(chunk, id))),
    reduce((result, chunkResult) => deepMerge(result, chunkResult))
  );

  return lastValueFrom(result$);
};

/**
 * Support functions for processInChunks
 */

/**
 * This function supports the steps piped in the resolution performed by processInChunks.
 * It returns a rxjs operator that, given a predicate callback as an argument that takes the current chunk and the current Item from the list,
 * uses this callback predicate to compute whether the current item fits in the current chunk,
 * or whether we need to consider the current chunk filled and start a new one.
 */
const bufferUntil = <TItem>(
  predicate: (chunk: TItem[], currentItem: TItem) => boolean
): OperatorFunction<TItem, TItem[]> => {
  return (source) =>
    new Observable((observer) => {
      let chunk: TItem[] = [];

      return source.subscribe({
        next(currentItem) {
          if (predicate(chunk, currentItem)) {
            chunk.push(currentItem);
          } else {
            // Emit the current chunk, start a new one
            if (chunk.length > 0) observer.next(chunk);
            chunk = [currentItem]; // Reset the chunk with the current item
          }
        },
        complete() {
          // Emit the final chunk if it has any items
          if (chunk.length > 0) observer.next(chunk);
          observer.complete();
        },
      });
    });
};

const isLessThanMaxChunkLength = (chunk: string[], currentItem: string, chunkSize: number) => {
  const totalLength = [...chunk, currentItem].join().length;
  return totalLength <= chunkSize; // Allow the chunk until it exceeds the max chunk length
};
