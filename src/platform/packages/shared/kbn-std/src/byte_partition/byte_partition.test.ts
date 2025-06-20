/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bytePartition, MAX_HTTP_LINE_CHUNK_SIZE } from './byte_partition';

describe('bytePartition', () => {
  describe('basic partitioning', () => {
    it('should return single chunk when input fits within default chunk size', () => {
      const input = ['short', 'strings', 'test'];
      const result = bytePartition(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['short', 'strings', 'test']);
    });

    it('should create multiple chunks when input exceeds chunk size', () => {
      const input = Array(1000).fill('logs-dataset-default'); // ~20k chars
      const result = bytePartition(input);

      expect(result.length).toBeGreaterThan(1);
      expect(result.length).toBe(7); // ~20k/3072 ≈ 7 chunks

      // Verify all items are preserved
      const flatResult = result.flat();
      expect(flatResult).toEqual(input);
    });

    it('should respect custom chunk size', () => {
      const input = ['a'.repeat(50), 'b'.repeat(50), 'c'.repeat(50)]; // Each 50 chars
      const customChunkSize = 100; // Should fit 2 items per chunk

      const result = bytePartition(input, customChunkSize);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([input[0], input[1]]); // First two items
      expect(result[1]).toEqual([input[2]]); // Last item
    });
  });

  describe('edge cases', () => {
    it('should handle empty input array', () => {
      const input: string[] = [];
      const result = bytePartition(input);

      expect(result).toEqual([]);
    });

    it('should handle single item input', () => {
      const input = ['single-item'];
      const result = bytePartition(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['single-item']);
    });

    it('should handle single item that exceeds chunk size', () => {
      const longString = 'a'.repeat(5000); // Exceeds default chunk size
      const input = [longString];
      const result = bytePartition(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([longString]);
    });

    it('should handle items with varying lengths', () => {
      const input = ['short', 'a'.repeat(100), 'medium-length', 'x'];
      const customChunkSize = 120;

      const result = bytePartition(input, customChunkSize);

      // Verify chunks respect size limits
      result.forEach((chunk) => {
        const totalLength = chunk.reduce((sum, item) => sum + item.length, 0);
        expect(totalLength).toBeLessThanOrEqual(customChunkSize);
      });
    });

    it('should handle empty strings in input', () => {
      const input = ['', 'non-empty', '', 'another'];
      const result = bytePartition(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['', 'non-empty', '', 'another']);
    });

    it('should handle unicode and special characters', () => {
      const input = ['🚀', '测试', 'café', 'naïve'];
      const result = bytePartition(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['🚀', '测试', 'café', 'naïve']);
    });
  });

  describe('chunk size optimization', () => {
    it('should maximize chunk utilization within size limits', () => {
      const input = Array(100).fill('item'); // Each 4 chars
      const customChunkSize = 50; // Should fit ~12 items per chunk

      const result = bytePartition(input, customChunkSize);

      // Verify efficient packing
      result.forEach((chunk, index) => {
        const totalLength = chunk.reduce((sum, item) => sum + item.length, 0);

        if (index < result.length - 1) {
          // All chunks except the last should be close to the limit
          expect(totalLength).toBeLessThanOrEqual(customChunkSize);
          expect(totalLength).toBeGreaterThan(customChunkSize * 0.8); // At least 80% utilization
        } else {
          // Last chunk can be smaller
          expect(totalLength).toBeLessThanOrEqual(customChunkSize);
        }
      });
    });

    it('should handle mixed item sizes efficiently', () => {
      const shortItems = Array(50).fill('short'); // 5 chars each
      const longItems = Array(10).fill('a'.repeat(200)); // 200 chars each
      const input = [...shortItems, ...longItems];

      const result = bytePartition(input);

      // Verify all items are preserved
      const flatResult = result.flat();
      expect(flatResult).toEqual(input);

      // Verify chunks respect size limits
      result.forEach((chunk) => {
        const totalLength = chunk.reduce((sum, item) => sum + item.length, 0);
        expect(totalLength).toBeLessThanOrEqual(MAX_HTTP_LINE_CHUNK_SIZE);
      });
    });
  });

  describe('boundary conditions', () => {
    it('should handle items that exactly match chunk size', () => {
      const exactSizeItem = 'a'.repeat(100);
      const input = [exactSizeItem];
      const result = bytePartition(input, 100);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([exactSizeItem]);
    });

    it('should handle multiple items that exactly fill chunk size', () => {
      const items = ['a'.repeat(50), 'b'.repeat(50)]; // Total 100 chars
      const input = items;
      const result = bytePartition(input, 100);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items);
    });

    it('should create new chunk when adding item would exceed limit', () => {
      const items = ['a'.repeat(60), 'b'.repeat(50)]; // 60 + 50 = 110 > 100
      const input = items;
      const result = bytePartition(input, 100);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([items[0]]);
      expect(result[1]).toEqual([items[1]]);
    });

    it('should handle very small chunk sizes', () => {
      const input = ['ab', 'cd', 'ef'];
      const verySmallChunkSize = 2; // Each item should be in its own chunk

      const result = bytePartition(input, verySmallChunkSize);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['ab']);
      expect(result[1]).toEqual(['cd']);
      expect(result[2]).toEqual(['ef']);
    });
  });
});
