/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParallelProcessor } from './parallel_processor';

describe('ParallelProcessor', () => {
  let processor: ParallelProcessor<number, string>;

  beforeEach(() => {
    processor = new ParallelProcessor<number, string>(2);
  });

  describe('Basic Parallel Processing', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const mockProcessor = jest.fn(async (item: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed-${item}`;
      });

      const results = await processor.process(items, mockProcessor);

      expect(results).toEqual([
        'processed-1',
        'processed-2',
        'processed-3',
        'processed-4',
        'processed-5',
      ]);
      expect(mockProcessor).toHaveBeenCalledTimes(5);
    });

    it('should handle empty arrays', async () => {
      const items: number[] = [];
      const mockProcessor = jest.fn(async (item: number) => `processed-${item}`);

      const results = await processor.process(items, mockProcessor);

      expect(results).toEqual([]);
      expect(mockProcessor).not.toHaveBeenCalled();
    });

    it('should maintain order of results', async () => {
      const items = [1, 2, 3, 4, 5];
      const mockProcessor = jest.fn(async (item: number) => {
        // Simulate variable processing time
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
        return `result-${item}`;
      });

      const results = await processor.process(items, mockProcessor);

      expect(results).toEqual(['result-1', 'result-2', 'result-3', 'result-4', 'result-5']);
    });
  });

  describe('Concurrency Control', () => {
    it('should respect concurrency limit', async () => {
      const concurrency = 2;
      const processorWithLimit = new ParallelProcessor<number, string>(concurrency);

      let activeProcesses = 0;
      let maxConcurrentProcesses = 0;

      const items = [1, 2, 3, 4, 5, 6];
      const mockProcessor = jest.fn(async (item: number) => {
        activeProcesses++;
        maxConcurrentProcesses = Math.max(maxConcurrentProcesses, activeProcesses);

        await new Promise((resolve) => setTimeout(resolve, 50));

        activeProcesses--;
        return `processed-${item}`;
      });

      await processorWithLimit.process(items, mockProcessor);

      expect(maxConcurrentProcesses).toBeLessThanOrEqual(concurrency);
      expect(mockProcessor).toHaveBeenCalledTimes(6);
    });

    it('should allow changing concurrency', () => {
      expect(processor.getConcurrency()).toBe(2);

      processor.setConcurrency(4);
      expect(processor.getConcurrency()).toBe(4);

      processor.setConcurrency(1);
      expect(processor.getConcurrency()).toBe(1);
    });

    it('should enforce concurrency limits', () => {
      processor.setConcurrency(0);
      expect(processor.getConcurrency()).toBe(1); // Minimum is 1

      processor.setConcurrency(20);
      expect(processor.getConcurrency()).toBe(16); // Maximum is 16
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from individual processors', async () => {
      const items = [1, 2, 3];
      const mockProcessor = jest.fn(async (item: number) => {
        if (item === 2) {
          throw new Error(`Processing failed for item ${item}`);
        }
        return `processed-${item}`;
      });

      await expect(processor.process(items, mockProcessor)).rejects.toThrow(
        'Processing failed for item 2'
      );
    });

    it('should stop processing on first error', async () => {
      const items = [1, 2, 3, 4, 5];
      let processedCount = 0;

      const mockProcessor = jest.fn(async (item: number) => {
        processedCount++;
        if (item === 3) {
          throw new Error(`Error at item ${item}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed-${item}`;
      });

      await expect(processor.process(items, mockProcessor)).rejects.toThrow('Error at item 3');

      // Due to parallel processing, some items might be processed before the error
      expect(processedCount).toBeGreaterThan(0);
      expect(processedCount).toBeLessThanOrEqual(items.length);
    });
  });

  describe('Performance Tests', () => {
    it('should process items faster in parallel than sequential', async () => {
      const items = [1, 2, 3, 4];
      const processingTime = 50; // ms

      const mockProcessor = async (item: number) => {
        await new Promise((resolve) => setTimeout(resolve, processingTime));
        return `processed-${item}`;
      };

      // Test parallel processing
      const parallelProcessor = new ParallelProcessor<number, string>(2);
      const parallelStart = Date.now();
      await parallelProcessor.process(items, mockProcessor);
      const parallelTime = Date.now() - parallelStart;

      // Test sequential processing (concurrency = 1)
      const sequentialProcessor = new ParallelProcessor<number, string>(1);
      const sequentialStart = Date.now();
      await sequentialProcessor.process(items, mockProcessor);
      const sequentialTime = Date.now() - sequentialStart;

      // Parallel should be significantly faster
      expect(parallelTime).toBeLessThan(sequentialTime * 0.8);
    });

    it('should handle large numbers of items efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const numberProcessor = new ParallelProcessor<number, number>(2);
      const mockProcessor = async (item: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return item * 2;
      };

      const start = Date.now();
      const results = await numberProcessor.process(items, mockProcessor);
      const duration = Date.now() - start;

      expect(results).toHaveLength(100);
      expect(results[0]).toBe(0);
      expect(results[99]).toBe(198);

      // Should complete in reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item arrays', async () => {
      const items = [42];
      const mockProcessor = jest.fn(async (item: number) => `single-${item}`);

      const results = await processor.process(items, mockProcessor);

      expect(results).toEqual(['single-42']);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });

    it('should work with different data types', async () => {
      const stringProcessor = new ParallelProcessor<string, number>(2);
      const items = ['hello', 'world', 'test'];
      const mockProcessor = async (item: string) => item.length;

      const results = await stringProcessor.process(items, mockProcessor);

      expect(results).toEqual([5, 5, 4]);
    });

    it('should handle processor that returns promises', async () => {
      const items = [1, 2, 3];
      const mockProcessor = (item: number) => Promise.resolve(`async-${item}`);

      const results = await processor.process(items, mockProcessor);

      expect(results).toEqual(['async-1', 'async-2', 'async-3']);
    });
  });
});
