/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NamespacedCache } from './namespaced_cache';

describe('NamespacedCache', () => {
  let cache: NamespacedCache;

  beforeEach(() => {
    cache = new NamespacedCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  describe('get/set', () => {
    it('stores and retrieves values by namespace', () => {
      cache.set('default', 'value1', 5000);
      expect(cache.get('default')).toBe('value1');
    });

    it('returns null for non-existent namespaces', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('supports different value types', () => {
      cache.set('ns1', 'text', 5000);
      cache.set('ns2', 42, 5000);
      cache.set('ns3', { foo: 'bar' }, 5000);
      cache.set('ns4', [1, 2, 3], 5000);

      expect(cache.get('ns1')).toBe('text');
      expect(cache.get('ns2')).toBe(42);
      expect(cache.get('ns3')).toEqual({ foo: 'bar' });
      expect(cache.get('ns4')).toEqual([1, 2, 3]);
    });

    it('isolates namespaces', () => {
      cache.set('space1', 'value1', 5000);
      cache.set('space2', 'value2', 5000);

      expect(cache.get('space1')).toBe('value1');
      expect(cache.get('space2')).toBe('value2');
    });
  });

  describe('TTL expiry', () => {
    it('removes entries after TTL expires', () => {
      cache.set('default', 'value1', 1000);
      expect(cache.get('default')).toBe('value1');

      jest.advanceTimersByTime(1000);
      expect(cache.get('default')).toBeNull();
    });

    it('does not expire before TTL', () => {
      cache.set('default', 'value1', 1000);
      expect(cache.get('default')).toBe('value1');

      jest.advanceTimersByTime(999);
      expect(cache.get('default')).toBe('value1');
    });

    it('handles different TTLs for different namespaces', () => {
      cache.set('ns1', 'value1', 1000);
      cache.set('ns2', 'value2', 2000);

      jest.advanceTimersByTime(1000);
      expect(cache.get('ns1')).toBeNull();
      expect(cache.get('ns2')).toBe('value2');

      jest.advanceTimersByTime(1000);
      expect(cache.get('ns2')).toBeNull();
    });
  });

  describe('del', () => {
    it('deletes a specific namespace', () => {
      cache.set('ns1', 'value1', 5000);
      cache.set('ns2', 'value2', 5000);

      cache.del('ns1');

      expect(cache.get('ns1')).toBeNull();
      expect(cache.get('ns2')).toBe('value2');
    });

    it('clears the timer when deleting', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('default', 'value1', 5000);
      cache.del('default');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('handles deleting non-existent namespaces', () => {
      expect(() => cache.del('nonexistent')).not.toThrow();
    });

    it('clears in-flight promises when deleting', () => {
      const promise = Promise.resolve('test-value');
      cache.setInflightRead('default', promise);

      expect(cache.getInflightRead('default')).toBe(promise);

      cache.del('default');

      expect(cache.getInflightRead('default')).toBeNull();
    });

    it('clears both cached value and in-flight promise', () => {
      cache.set('default', 'value1', 5000);
      const promise = Promise.resolve('test-value');
      cache.setInflightRead('default', promise);

      cache.del('default');

      expect(cache.get('default')).toBeNull();
      expect(cache.getInflightRead('default')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all cached entries', () => {
      cache.set('ns1', 'value1', 5000);
      cache.set('ns2', 'value2', 5000);

      cache.clear();

      expect(cache.get('ns1')).toBeNull();
      expect(cache.get('ns2')).toBeNull();
    });

    it('clears all timers', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('ns1', 'value1', 5000);
      cache.set('ns2', 'value2', 5000);

      cache.clear();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });

    it('clears all in-flight promises', () => {
      const promise1 = Promise.resolve('value1');
      const promise2 = Promise.resolve('value2');

      cache.setInflightRead('ns1', promise1);
      cache.setInflightRead('ns2', promise2);

      cache.clear();

      expect(cache.getInflightRead('ns1')).toBeNull();
      expect(cache.getInflightRead('ns2')).toBeNull();
    });
  });

  describe('has', () => {
    it('returns true for existing namespaces', () => {
      cache.set('default', 'value1', 5000);
      expect(cache.has('default')).toBe(true);
    });

    it('returns false for non-existent namespaces', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns false after TTL expires', () => {
      cache.set('default', 'value1', 1000);
      expect(cache.has('default')).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(cache.has('default')).toBe(false);
    });
  });

  describe('updating existing entries', () => {
    it('replaces value and resets timer when setting existing namespace', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('default', 'value1', 5000);
      cache.set('default', 'value2', 3000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(cache.get('default')).toBe('value2');

      jest.advanceTimersByTime(3000);
      expect(cache.get('default')).toBeNull();
    });
  });

  describe('in-flight promise tracking', () => {
    it('stores and retrieves in-flight promises', () => {
      const promise = Promise.resolve('test-value');
      cache.setInflightRead('default', promise);

      const retrieved = cache.getInflightRead('default');
      expect(retrieved).toBe(promise);
    });

    it('returns null for non-existent in-flight promises', () => {
      expect(cache.getInflightRead('nonexistent')).toBeNull();
    });

    it('isolates in-flight promises by namespace', () => {
      const promise1 = Promise.resolve('value1');
      const promise2 = Promise.resolve('value2');

      cache.setInflightRead('ns1', promise1);
      cache.setInflightRead('ns2', promise2);

      expect(cache.getInflightRead('ns1')).toBe(promise1);
      expect(cache.getInflightRead('ns2')).toBe(promise2);
    });

    it('auto-removes in-flight promise after it resolves', async () => {
      // Use real timers for this test since it involves actual promise resolution
      jest.useRealTimers();

      const promise = Promise.resolve('test-value');
      cache.setInflightRead('default', promise);

      expect(cache.getInflightRead('default')).toBe(promise);

      // Wait for promise to resolve and cleanup to run
      await promise;
      await new Promise((resolve) => setImmediate(resolve));

      expect(cache.getInflightRead('default')).toBeNull();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('auto-removes in-flight promise after it rejects', async () => {
      // Use real timers for this test since it involves actual promise resolution
      jest.useRealTimers();

      const promise = Promise.reject(new Error('test error'));
      cache.setInflightRead('default', promise);

      expect(cache.getInflightRead('default')).toBe(promise);

      // Wait for promise to reject (and catch to prevent unhandled rejection)
      await promise.catch(() => {});
      await new Promise((resolve) => setImmediate(resolve));

      expect(cache.getInflightRead('default')).toBeNull();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('allows multiple concurrent in-flight promises for different namespaces', () => {
      const promise1 = Promise.resolve('value1');
      const promise2 = Promise.resolve('value2');

      cache.setInflightRead('ns1', promise1);
      cache.setInflightRead('ns2', promise2);

      expect(cache.getInflightRead('ns1')).toBe(promise1);
      expect(cache.getInflightRead('ns2')).toBe(promise2);
    });

    it('replaces in-flight promise when setting same namespace again', () => {
      const promise1 = Promise.resolve('value1');
      const promise2 = Promise.resolve('value2');

      cache.setInflightRead('default', promise1);
      cache.setInflightRead('default', promise2);

      expect(cache.getInflightRead('default')).toBe(promise2);
    });
  });
});
