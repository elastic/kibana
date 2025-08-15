/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MemoryManager } from './memory_manager';

describe('MemoryManager', () => {
  describe('Memory Usage Monitoring', () => {
    it('should check memory usage and return valid data', () => {
      const memoryCheck = MemoryManager.checkMemoryUsage();

      expect(memoryCheck).toHaveProperty('usage');
      expect(memoryCheck).toHaveProperty('percentage');
      expect(memoryCheck).toHaveProperty('warning');
      expect(memoryCheck).toHaveProperty('critical');

      expect(typeof memoryCheck.usage.heapUsed).toBe('number');
      expect(typeof memoryCheck.usage.heapTotal).toBe('number');
      expect(typeof memoryCheck.usage.external).toBe('number');
      expect(typeof memoryCheck.usage.rss).toBe('number');

      expect(typeof memoryCheck.percentage).toBe('number');
      expect(memoryCheck.percentage).toBeGreaterThanOrEqual(0);
      expect(memoryCheck.percentage).toBeLessThanOrEqual(1);

      expect(typeof memoryCheck.warning).toBe('boolean');
      expect(typeof memoryCheck.critical).toBe('boolean');
    });

    it('should correctly calculate memory percentage', () => {
      const memoryCheck = MemoryManager.checkMemoryUsage();
      const expectedPercentage = memoryCheck.usage.heapUsed / memoryCheck.usage.heapTotal;

      expect(memoryCheck.percentage).toBeCloseTo(expectedPercentage, 5);
    });

    it('should indicate warning when memory usage is high', () => {
      const memoryCheck = MemoryManager.checkMemoryUsage();

      // Warning should be true if percentage > 0.8
      if (memoryCheck.percentage > 0.8) {
        expect(memoryCheck.warning).toBe(true);
      } else {
        expect(memoryCheck.warning).toBe(false);
      }
    });

    it('should indicate critical when memory usage is very high', () => {
      const memoryCheck = MemoryManager.checkMemoryUsage();

      // Critical should be true if percentage > 0.9
      if (memoryCheck.percentage > 0.9) {
        expect(memoryCheck.critical).toBe(true);
      } else {
        expect(memoryCheck.critical).toBe(false);
      }
    });
  });

  describe('Memory Pressure Assessment', () => {
    it('should return valid memory pressure levels', () => {
      const pressure = MemoryManager.getMemoryPressure();
      const validPressures = ['low', 'medium', 'high', 'critical'];

      expect(validPressures).toContain(pressure);
    });

    it('should return consistent pressure level with memory check', () => {
      const memoryCheck = MemoryManager.checkMemoryUsage();
      const pressure = MemoryManager.getMemoryPressure();

      if (memoryCheck.percentage > 0.9) {
        expect(pressure).toBe('critical');
      } else if (memoryCheck.percentage > 0.8) {
        expect(pressure).toBe('high');
      } else if (memoryCheck.percentage > 0.6) {
        expect(pressure).toBe('medium');
      } else {
        expect(pressure).toBe('low');
      }
    });
  });

  describe('Garbage Collection', () => {
    it('should handle garbage collection gracefully', () => {
      // Test forceGarbageCollection when gc is not available
      const originalGc = global.gc;
      delete (global as any).gc;

      const result = MemoryManager.forceGarbageCollection();
      expect(result).toBe(false);

      // Restore gc if it was available
      if (originalGc) {
        global.gc = originalGc;
      }
    });

    it('should force garbage collection when available', () => {
      // Mock global.gc
      const mockGc = jest.fn();
      global.gc = mockGc;

      const result = MemoryManager.forceGarbageCollection();

      expect(result).toBe(true);
      expect(mockGc).toHaveBeenCalledTimes(1);

      // Clean up
      delete (global as any).gc;
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent readings across multiple calls', () => {
      const readings = [];

      // Take multiple readings
      for (let i = 0; i < 5; i++) {
        readings.push(MemoryManager.checkMemoryUsage());
      }

      // All readings should have valid structure
      readings.forEach((reading) => {
        expect(reading.percentage).toBeGreaterThanOrEqual(0);
        expect(reading.percentage).toBeLessThanOrEqual(1);
        expect(typeof reading.warning).toBe('boolean');
        expect(typeof reading.critical).toBe('boolean');
      });

      // Memory usage should be relatively stable (within reasonable variance)
      const percentages = readings.map((r) => r.percentage);
      const maxPercentage = Math.max(...percentages);
      const minPercentage = Math.min(...percentages);

      // Allow for some variance but expect stability
      expect(maxPercentage - minPercentage).toBeLessThan(0.1); // Less than 10% variance
    });

    it('should handle memory allocation and monitoring', async () => {
      const beforeCheck = MemoryManager.checkMemoryUsage();

      // Allocate some memory
      const largeArray = new Array(100000).fill('test data for memory pressure testing');

      const afterCheck = MemoryManager.checkMemoryUsage();

      // Memory usage should have increased
      expect(afterCheck.usage.heapUsed).toBeGreaterThanOrEqual(beforeCheck.usage.heapUsed);

      // Clean up
      largeArray.length = 0;
    });

    it('should correctly track memory pressure under simulated load', () => {
      // Create memory pressure simulation
      const memoryHogs: any[] = [];

      try {
        // Allocate memory in chunks
        for (let i = 0; i < 10; i++) {
          memoryHogs.push(new Array(10000).fill(`data-${i}`));
        }

        const pressureUnderLoad = MemoryManager.getMemoryPressure();
        const memoryCheck = MemoryManager.checkMemoryUsage();

        // Verify the pressure assessment makes sense
        if (memoryCheck.percentage > 0.8) {
          expect(['high', 'critical']).toContain(pressureUnderLoad);
        }

        expect(['low', 'medium', 'high', 'critical']).toContain(pressureUnderLoad);
      } finally {
        // Clean up memory
        memoryHogs.forEach((hog) => (hog.length = 0));
        memoryHogs.length = 0;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge case memory states', () => {
      // Test with current memory state
      const check = MemoryManager.checkMemoryUsage();

      // Ensure critical implies warning
      if (check.critical) {
        expect(check.warning).toBe(true);
      }

      // Ensure percentage is valid
      expect(check.percentage).not.toBeNaN();
      expect(Number.isFinite(check.percentage)).toBe(true);
    });

    it('should provide stable readings under normal conditions', () => {
      const reading1 = MemoryManager.checkMemoryUsage();
      const reading2 = MemoryManager.checkMemoryUsage();

      // Readings should be very similar under normal conditions
      expect(Math.abs(reading1.percentage - reading2.percentage)).toBeLessThan(0.05);
    });
  });
});
