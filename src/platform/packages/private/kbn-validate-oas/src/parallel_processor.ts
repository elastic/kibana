/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Processes multiple items in parallel with controlled concurrency for optimal performance.
 *
 * This class provides a controlled parallel processing mechanism that limits the number
 * of concurrent operations to prevent resource exhaustion while maximizing throughput.
 * It's particularly useful for I/O-bound operations like file validation where parallel
 * processing can significantly improve performance.
 *
 * @template T - The type of items being processed
 * @template R - The type of results returned by the processor function
 *
 * @example
 * ```typescript
 * import { ParallelProcessor } from './parallel_processor';
 *
 * const processor = new ParallelProcessor<string, ValidationResult>(4);
 *
 * const files = ['spec1.yaml', 'spec2.yaml', 'spec3.yaml'];
 * const results = await processor.process(files, async (filePath) => {
 *   return await validateOASFile(filePath);
 * });
 *
 * log.info(`Validated ${results.length} files`);
 *
 * // Custom concurrency for different workloads
 * const lightProcessor = new ParallelProcessor(2); // For heavy CPU work
 * const heavyProcessor = new ParallelProcessor(8); // For light I/O work
 * ```
 *
 * @public
 */
export class ParallelProcessor<T, R> {
  private concurrency: number;

  constructor(concurrency: number = 4) {
    this.concurrency = Math.max(1, Math.min(concurrency, 16)); // Limit between 1-16
  }

  /**
   * Processes multiple items in parallel with controlled concurrency.
   *
   * This method takes an array of items and a processor function, then executes
   * the processor function for each item with controlled parallelism to optimize
   * performance while avoiding resource exhaustion.
   *
   * @param items - Array of items to process
   * @param processor - Async function that processes each item
   * @returns Promise resolving to array of results in the same order as input items
   *
   * @example
   * ```typescript
   * const processor = new ParallelProcessor<string, number>(3);
   *
   * // Process file sizes in parallel
   * const filePaths = ['file1.txt', 'file2.txt', 'file3.txt'];
   * const sizes = await processor.process(filePaths, async (filePath) => {
   *   const stats = await fs.stat(filePath);
   *   return stats.size;
   * });
   *
   * // Results maintain original order
   * console.log(sizes); // [1024, 2048, 512]
   * ```
   *
   * @throws {Error} If any processor function throws an error, it will be propagated
   */
  async process(items: T[], processor: (item: T) => Promise<R>): Promise<R[]> {
    if (items.length === 0) {
      return [];
    }

    const results: R[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    let index = 0;

    const processNext = async (): Promise<void> => {
      const currentIndex = index++;
      if (currentIndex >= items.length) {
        return;
      }

      try {
        results[currentIndex] = await processor(items[currentIndex]);
      } catch (error) {
        throw error;
      }

      return processNext();
    };

    for (let i = 0; i < Math.min(this.concurrency, items.length); i++) {
      executing.push(processNext());
    }

    await Promise.all(executing);

    return results;
  }

  setConcurrency(concurrency: number): void {
    this.concurrency = Math.max(1, Math.min(concurrency, 16));
  }

  getConcurrency(): number {
    return this.concurrency;
  }
}
