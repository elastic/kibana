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
import { ValidationCache } from '../src/validation_cache';
import type { BaseValidationFileResult } from '../src/base_validation';

describe('ValidationCache Integration', () => {
  let cache: ValidationCache;
  let tempDir: string;

  beforeEach(() => {
    cache = new ValidationCache({
      enabled: true,
      maxEntries: 10,
      maxAge: 60000, // 1 minute
      maxMemoryUsage: 1024 * 1024, // 1MB
      evictionPolicy: 'lru',
    });
    tempDir = Fs.mkdtempSync(Path.join(__dirname, 'temp-'));
  });

  afterEach(() => {
    cache.clear();
    if (Fs.existsSync(tempDir)) {
      Fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic cache operations', () => {
    it('should handle cache miss for non-existent entry', () => {
      const filePath = '/nonexistent/file.yaml';
      const result = cache.get(filePath);
      expect(result).toBeNull();
    });

    it('should cache and retrieve validation results', () => {
      const filePath = Path.join(tempDir, 'test-spec.yaml');

      // Create a test file
      Fs.writeFileSync(
        filePath,
        `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`
      );

      const validationResult: BaseValidationFileResult = {
        filePath,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Test cache miss
      const miss = cache.get(filePath);
      expect(miss).toBeNull();

      // Set cache entry
      cache.set(filePath, validationResult);

      // Test cache hit
      const hit = cache.get(filePath);
      expect(hit).toEqual(validationResult);
    });

    it('should clear cache completely', () => {
      const filePath1 = Path.join(tempDir, 'spec1.yaml');
      const filePath2 = Path.join(tempDir, 'spec2.yaml');

      // Create test files
      Fs.writeFileSync(
        filePath1,
        'openapi: 3.0.0\ninfo:\n  title: API 1\n  version: 1.0.0\npaths: {}'
      );
      Fs.writeFileSync(
        filePath2,
        'openapi: 3.0.0\ninfo:\n  title: API 2\n  version: 1.0.0\npaths: {}'
      );

      const result1: BaseValidationFileResult = {
        filePath: filePath1,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      const result2: BaseValidationFileResult = {
        filePath: filePath2,
        variant: 'traditional',
        valid: false,
        errors: [{ instancePath: '/info', message: 'Missing description' }],
        errorCount: 1,
      };

      // Set cache entries
      cache.set(filePath1, result1);
      cache.set(filePath2, result2);

      // Verify entries exist
      expect(cache.get(filePath1)).toEqual(result1);
      expect(cache.get(filePath2)).toEqual(result2);

      // Clear cache
      cache.clear();

      // Verify entries are gone
      expect(cache.get(filePath1)).toBeNull();
      expect(cache.get(filePath2)).toBeNull();
    });
  });

  describe('Cache behavior with file changes', () => {
    it('should invalidate cache when file is modified', async () => {
      const filePath = Path.join(tempDir, 'changing-spec.yaml');

      // Create initial file
      const initialContent = `
openapi: 3.0.0
info:
  title: Initial API
  version: 1.0.0
paths: {}
`;
      Fs.writeFileSync(filePath, initialContent);

      const initialResult: BaseValidationFileResult = {
        filePath,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Cache the initial result
      cache.set(filePath, initialResult);
      expect(cache.get(filePath)).toEqual(initialResult);

      // Wait a moment to ensure different modification time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify the file
      const modifiedContent = `
openapi: 3.0.0
info:
  title: Modified API
  version: 2.0.0
paths: {}
`;
      Fs.writeFileSync(filePath, modifiedContent);

      // Cache should return null due to file change detection
      const result = cache.get(filePath);
      expect(result).toBeNull();
    });

    it('should handle deleted files gracefully', () => {
      const filePath = Path.join(tempDir, 'temporary-spec.yaml');

      // Create and cache a file
      Fs.writeFileSync(
        filePath,
        'openapi: 3.0.0\ninfo:\n  title: Temp API\n  version: 1.0.0\npaths: {}'
      );

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      cache.set(filePath, result);
      expect(cache.get(filePath)).toEqual(result);

      // Delete the file
      Fs.unlinkSync(filePath);

      // Cache should return null for deleted file
      const deletedResult = cache.get(filePath);
      expect(deletedResult).toBeNull();
    });
  });

  describe('Cache configuration', () => {
    it('should respect enabled/disabled state', () => {
      const filePath = Path.join(tempDir, 'test-spec.yaml');
      Fs.writeFileSync(
        filePath,
        'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}'
      );

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Disable cache
      cache.setEnabled(false);
      expect(cache.isEnabled()).toBe(false);

      // Should always return null when disabled
      expect(cache.get(filePath)).toBeNull();

      cache.set(filePath, result);
      expect(cache.get(filePath)).toBeNull();

      // Re-enable cache
      cache.setEnabled(true);
      expect(cache.isEnabled()).toBe(true);

      // Should work normally when enabled
      cache.set(filePath, result);
      expect(cache.get(filePath)).toEqual(result);
    });

    it('should provide cache statistics', () => {
      const filePath = Path.join(tempDir, 'stats-spec.yaml');
      Fs.writeFileSync(
        filePath,
        'openapi: 3.0.0\ninfo:\n  title: Stats\n  version: 1.0.0\npaths: {}'
      );

      const result: BaseValidationFileResult = {
        filePath,
        variant: 'traditional',
        valid: true,
        errors: [],
        errorCount: 0,
      };

      // Initial stats
      const initialStats = cache.getStats();
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);

      // Generate some cache activity
      cache.get(filePath); // miss
      cache.set(filePath, result);
      cache.get(filePath); // hit
      cache.get(filePath); // hit

      const finalStats = cache.getStats();
      expect(finalStats.misses).toBeGreaterThan(initialStats.misses);
      expect(finalStats.hits).toBeGreaterThan(initialStats.hits);
    });
  });
});
