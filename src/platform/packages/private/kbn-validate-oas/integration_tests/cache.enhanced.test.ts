/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Path from 'node:path';
import { ValidationCache, createPerformanceCache } from '../src/validation_cache';
import type { BaseValidationFileResult } from '../src/base_validation';

describe('Enhanced Validation Cache', () => {
  let testDir: string;
  let cache: ValidationCache;

  beforeEach(() => {
    testDir = Fs.mkdtempSync(Path.join(__dirname, 'temp-enhanced-'));
    cache = new ValidationCache({
      enabled: true,
      maxEntries: 5,
      maxAge: 5000, // 5 seconds for testing
      maxMemoryUsage: 1024 * 1024, // 1MB
      evictionPolicy: 'lru',
    });
  });

  afterEach(() => {
    cache.clear();
    if (Fs.existsSync(testDir)) {
      Fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Enhanced Caching Features', () => {
    it('should track hit rates correctly', () => {
      const testFile = Path.join(testDir, 'test-hit-rate.yaml');
      const content = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
`;

      Fs.writeFileSync(testFile, content);

      const mockResult: BaseValidationFileResult = {
        filePath: testFile,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Initial miss
      const result1 = cache.get(testFile);
      expect(result1).toBeNull();

      // Set value
      cache.set(testFile, mockResult);

      // Hit
      const result2 = cache.get(testFile);
      expect(result2).toEqual(mockResult);

      // Another hit
      const result3 = cache.get(testFile);
      expect(result3).toEqual(mockResult);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2); // 2/3

      Fs.unlinkSync(testFile);
    });

    it('should implement LRU eviction policy correctly', () => {
      const testFiles = [];
      const mockResults: BaseValidationFileResult[] = [];

      // Create test files
      for (let i = 0; i < 7; i++) {
        const testFile = Path.join(testDir, `lru-test-${i}.yaml`);
        const content = `
openapi: 3.0.0
info:
  title: Test API ${i}
  version: 1.0.0
paths:
  /test${i}:
    get:
      responses:
        '200':
          description: Success
`;
        Fs.writeFileSync(testFile, content);
        testFiles.push(testFile);

        mockResults.push({
          filePath: testFile,
          variant: 'custom',
          valid: true,
          errors: [],
          errorCount: 0,
        });
      }

      // Fill cache to capacity (5 entries)
      for (let i = 0; i < 5; i++) {
        cache.set(testFiles[i], mockResults[i]);
      }

      // Access entries 1, 2, 3 to make them more recently used
      cache.get(testFiles[1]);
      cache.get(testFiles[2]);
      cache.get(testFiles[3]);

      // Add two more entries (should evict 0 and 4 as least recently used)
      cache.set(testFiles[5], mockResults[5]);
      cache.set(testFiles[6], mockResults[6]);

      // Check that 0 and 4 were evicted
      expect(cache.get(testFiles[0])).toBeNull();
      expect(cache.get(testFiles[4])).toBeNull();

      // Check that 1, 2, 3, 5, 6 are still cached
      expect(cache.get(testFiles[1])).toEqual(mockResults[1]);
      expect(cache.get(testFiles[2])).toEqual(mockResults[2]);
      expect(cache.get(testFiles[3])).toEqual(mockResults[3]);
      expect(cache.get(testFiles[5])).toEqual(mockResults[5]);
      expect(cache.get(testFiles[6])).toEqual(mockResults[6]);

      // Clean up
      for (const file of testFiles) {
        Fs.unlinkSync(file);
      }
    });

    it('should handle parallel processing correctly', async () => {
      const testFiles = [];
      const processingTimes: number[] = [];

      // Create test files
      for (let i = 0; i < 5; i++) {
        const testFile = Path.join(testDir, `parallel-test-${i}.yaml`);
        const content = `
openapi: 3.0.0
info:
  title: Parallel Test API ${i}
  version: 1.0.0
paths:
  /test${i}:
    get:
      responses:
        '200':
          description: Success
`;
        Fs.writeFileSync(testFile, content);
        testFiles.push(testFile);
      }

      const processor = async (filePath: string): Promise<BaseValidationFileResult> => {
        const startTime = Date.now();
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 50));
        const endTime = Date.now();
        processingTimes.push(endTime - startTime);

        return {
          filePath,
          variant: 'custom',
          valid: true,
          errors: [],
          errorCount: 0,
        };
      };

      // First run - all files should be processed
      const startTime = Date.now();
      const results1 = await cache.processFiles(testFiles, processor);
      const firstRunTime = Date.now() - startTime;

      expect(results1).toHaveLength(5);
      expect(processingTimes).toHaveLength(5);

      // Second run - all files should be cached
      processingTimes.length = 0; // Reset
      const startTime2 = Date.now();
      const results2 = await cache.processFiles(testFiles, processor);
      const secondRunTime = Date.now() - startTime2;

      expect(results2).toHaveLength(5);
      expect(processingTimes).toHaveLength(0); // No processing should occur
      expect(secondRunTime).toBeLessThan(firstRunTime * 0.5); // Much faster due to caching

      // Clean up
      for (const file of testFiles) {
        Fs.unlinkSync(file);
      }
    });

    it('should warm cache effectively', async () => {
      const testFiles = [];

      // Create test files
      for (let i = 0; i < 3; i++) {
        const testFile = Path.join(testDir, `warm-test-${i}.yaml`);
        const content = `
openapi: 3.0.0
info:
  title: Warm Test API ${i}
  version: 1.0.0
paths:
  /test${i}:
    get:
      responses:
        '200':
          description: Success
`;
        Fs.writeFileSync(testFile, content);
        testFiles.push(testFile);
      }

      const processor = async (filePath: string): Promise<BaseValidationFileResult> => {
        return {
          filePath,
          variant: 'custom',
          valid: true,
          errors: [],
          errorCount: 0,
        };
      };

      // Warm the cache
      await cache.warmCache(testFiles, processor);

      // All files should now be cached
      for (const file of testFiles) {
        const result = cache.get(file);
        expect(result).not.toBeNull();
        expect(result!.filePath).toBe(file);
      }

      const stats = cache.getStats();
      expect(stats.entries).toBe(3);
      expect(stats.hits).toBe(3); // From the cache.get() calls above

      // Clean up
      for (const file of testFiles) {
        Fs.unlinkSync(file);
      }
    });

    it('should provide accurate performance statistics', () => {
      const testFile = Path.join(testDir, 'stats-test.yaml');
      const content = `
openapi: 3.0.0
info:
  title: Stats Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
`;

      Fs.writeFileSync(testFile, content);

      const mockResult: BaseValidationFileResult = {
        filePath: testFile,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Initial state
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.entries).toBe(0);

      // Add entry
      cache.set(testFile, mockResult);
      stats = cache.getStats();
      expect(stats.entries).toBe(1);

      // Hit
      cache.get(testFile);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.averageAccessTime).toBeGreaterThanOrEqual(0);

      // Miss
      cache.get('non-existent-file');
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total requests

      Fs.unlinkSync(testFile);
    });
  });

  describe('Performance Cache Factory', () => {
    it('should create performance-optimized cache instances', () => {
      const perfCache = createPerformanceCache();

      const stats = perfCache.getStats();
      expect(stats.entries).toBe(0);

      // Verify it's using performance settings
      expect(perfCache.isEnabled()).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customCache = createPerformanceCache({
        maxEntries: 100,
        evictionPolicy: 'lfu',
      });

      expect(customCache.isEnabled()).toBe(true);
    });
  });
});
