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
import { ValidationCache } from './validation_cache';
import type { BaseValidationFileResult } from './base_validation';

describe('ValidationCache', () => {
  let cache: ValidationCache;
  let tempDir: string;

  beforeEach(() => {
    cache = new ValidationCache();
    tempDir = Fs.mkdtempSync(Path.join(__dirname, 'test-'));
  });

  afterEach(() => {
    cache.clear();
    Fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve validation results', () => {
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      cache.set(filePath, result);
      const retrieved = cache.get(filePath);

      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent files', () => {
      const result = cache.get('/non/existent/file.yaml');
      expect(result).toBeNull();
    });

    it('should clear all cache entries', () => {
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      cache.set(filePath, result);
      expect(cache.get(filePath)).toEqual(result);

      cache.clear();
      expect(cache.get(filePath)).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when file changes', async () => {
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result1: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      cache.set(filePath, result1);
      expect(cache.get(filePath)).toEqual(result1);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify file
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Modified\n  version: 1.0.0');

      // Cache should be invalidated
      expect(cache.get(filePath)).toBeNull();
    });

    it('should invalidate expired cache entries', (done) => {
      const cacheWithShortTtl = new ValidationCache({ maxAge: 50 }); // 50ms TTL
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      cacheWithShortTtl.set(filePath, result);
      expect(cacheWithShortTtl.get(filePath)).toEqual(result);

      // Wait for expiration
      setTimeout(() => {
        expect(cacheWithShortTtl.get(filePath)).toBeNull();
        done();
      }, 100);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      const statsBefore = cache.getStats();
      cache.set(filePath, result);
      const statsAfter = cache.getStats();

      expect(statsAfter.entries).toBeGreaterThan(statsBefore.entries);
      expect(statsAfter.memoryUsage).toBeGreaterThan(statsBefore.memoryUsage);
    });

    it('should evict old entries when memory limit exceeded', () => {
      const smallCache = new ValidationCache({ maxMemoryUsage: 1000 }); // Very small limit

      // Add many entries to exceed memory limit
      for (let i = 0; i < 20; i++) {
        const filePath = Path.join(tempDir, `test${i}.yaml`);
        Fs.writeFileSync(filePath, `openapi: 3.0.0\ninfo:\n  title: Test${i}\n  version: 1.0.0`);

        const result: BaseValidationFileResult = {
          filePath,
          variant: 'custom',
          valid: true,
          errors: [],
          errorCount: 0,
        };

        smallCache.set(filePath, result);
      }

      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThan(20); // Some entries should have been evicted
    });

    it('should evict old entries when entry count limit exceeded', () => {
      const limitedCache = new ValidationCache({ maxEntries: 5 });

      // Add more entries than the limit
      for (let i = 0; i < 10; i++) {
        const filePath = Path.join(tempDir, `test${i}.yaml`);
        Fs.writeFileSync(filePath, `openapi: 3.0.0\ninfo:\n  title: Test${i}\n  version: 1.0.0`);

        const result: BaseValidationFileResult = {
          filePath,
          variant: 'custom',
          valid: true,
          errors: [],
          errorCount: 0,
        };

        limitedCache.set(filePath, result);
      }

      const stats = limitedCache.getStats();
      expect(stats.entries).toBeLessThanOrEqual(5);
    });
  });

  describe('Cache Control', () => {
    it('should respect disabled cache setting', () => {
      const disabledCache = new ValidationCache({ enabled: false });
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      disabledCache.set(filePath, result);
      expect(disabledCache.get(filePath)).toBeNull();
    });

    it('should allow enabling and disabling cache', () => {
      const filePath = Path.join(tempDir, 'test.yaml');
      Fs.writeFileSync(filePath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0');

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Enable cache and add entry
      cache.setEnabled(true);
      cache.set(filePath, result);
      expect(cache.get(filePath)).toEqual(result);

      // Disable cache
      cache.setEnabled(false);
      expect(cache.get(filePath)).toBeNull();
      expect(cache.getStats().entries).toBe(0);

      // Re-enable cache
      cache.setEnabled(true);
      expect(cache.isEnabled()).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('oldestEntry');
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
    });

    it('should track oldest entry correctly', (done) => {
      const filePath1 = Path.join(tempDir, 'test1.yaml');
      const filePath2 = Path.join(tempDir, 'test2.yaml');

      Fs.writeFileSync(filePath1, 'openapi: 3.0.0\ninfo:\n  title: Test1\n  version: 1.0.0');
      Fs.writeFileSync(filePath2, 'openapi: 3.0.0\ninfo:\n  title: Test2\n  version: 1.0.0');

      const result1: BaseValidationFileResult = {
        filePath: filePath1,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      const result2: BaseValidationFileResult = {
        filePath: filePath2,
        variant: 'custom',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      const timestamp1 = Date.now();
      cache.set(filePath1, result1);

      // Wait a bit
      setTimeout(() => {
        cache.set(filePath2, result2);
        const stats = cache.getStats();
        expect(stats.oldestEntry).toBeGreaterThanOrEqual(timestamp1);
        done();
      }, 10);
    });
  });
});
