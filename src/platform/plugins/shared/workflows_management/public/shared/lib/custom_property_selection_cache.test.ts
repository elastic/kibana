/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SelectionOption } from '@kbn/workflows/types/v1';
import {
  cacheSearchOptions,
  clearCache,
  getCachedOption,
  getCachedSearchOption,
  getCacheKeyForValue,
  setCachedOption,
} from './custom_property_selection_cache';

describe('custom_property_selection_cache', () => {
  const mockOption1: SelectionOption = {
    value: 'proxy-1',
    label: 'Production Proxy',
    description: 'URL: https://example.com',
    documentation: 'Production proxy server',
  };

  const mockOption2: SelectionOption = {
    value: 'proxy-2',
    label: 'Staging Proxy',
    description: 'URL: https://staging.example.com',
  };

  const mockOption3: SelectionOption = {
    value: 'proxy-3',
    label: 'Development Proxy',
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    clearCache();
  });

  afterEach(() => {
    clearCache();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getCacheKeyForValue', () => {
    it('should generate cache key with string value', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(key).toBe('step.type:config:proxy.id:proxy-1');
    });

    it('should generate cache key with number value', () => {
      const key = getCacheKeyForValue('step.type', 'input', 'port', 8080);
      expect(key).toBe('step.type:input:port:8080');
    });

    it('should generate cache key with null value', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', null);
      expect(key).toBe('step.type:config:proxy.id:null');
    });

    it('should generate cache key with undefined value', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', undefined);
      expect(key).toBe('step.type:config:proxy.id:undefined');
    });

    it('should generate different keys for different scopes', () => {
      const configKey = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      const inputKey = getCacheKeyForValue('step.type', 'input', 'proxy.id', 'proxy-1');
      expect(configKey).not.toBe(inputKey);
    });

    it('should generate different keys for different property keys', () => {
      const key1 = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      const key2 = getCacheKeyForValue('step.type', 'config', 'agent.id', 'proxy-1');
      expect(key1).not.toBe(key2);
    });
  });

  describe('setCachedOption and getCachedOption', () => {
    it('should store and retrieve cached option', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      setCachedOption(key, mockOption1);

      const cached = getCachedOption(key);
      expect(cached).toEqual(mockOption1);
    });

    it('should return null for non-existent cache key', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'non-existent');
      const cached = getCachedOption(key);
      expect(cached).toBeNull();
    });

    it('should return null for expired cache entry', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      setCachedOption(key, mockOption1);

      jest.advanceTimersByTime(30 * 1000 + 1);

      const cached = getCachedOption(key);
      expect(cached).toBeNull();
    });

    it('should return cached option within TTL', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      setCachedOption(key, mockOption1);

      jest.advanceTimersByTime(30 * 1000 - 1);

      const cached = getCachedOption(key);
      expect(cached).toEqual(mockOption1);
    });

    it('should update existing cache entry', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      setCachedOption(key, mockOption1);

      const updatedOption: SelectionOption = {
        ...mockOption1,
        label: 'Updated Proxy',
      };
      setCachedOption(key, updatedOption);

      const cached = getCachedOption(key);
      expect(cached).toEqual(updatedOption);
    });

    it('should handle multiple cache entries independently', () => {
      const key1 = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      const key2 = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-2');

      setCachedOption(key1, mockOption1);
      setCachedOption(key2, mockOption2);

      expect(getCachedOption(key1)).toEqual(mockOption1);
      expect(getCachedOption(key2)).toEqual(mockOption2);
    });
  });

  describe('cacheSearchOptions', () => {
    it('should cache search options', () => {
      const options = [mockOption1, mockOption2, mockOption3];
      cacheSearchOptions('step.type', 'config', 'proxy.id', options);

      const cached1 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      const cached2 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-2');
      const cached3 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-3');

      expect(cached1).toEqual(mockOption1);
      expect(cached2).toEqual(mockOption2);
      expect(cached3).toEqual(mockOption3);
    });

    it('should cache individual options via setCachedOption', () => {
      const options = [mockOption1];
      cacheSearchOptions('step.type', 'config', 'proxy.id', options);

      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      const cached = getCachedOption(key);
      expect(cached).toEqual(mockOption1);
    });

    it('should handle empty options array', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', []);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cached).toBeNull();
    });

    it('should overwrite previous search cache', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption2]);

      const cached1 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      const cached2 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-2');

      expect(cached1).toBeNull();
      expect(cached2).toEqual(mockOption2);
    });

    it('should handle different scopes independently', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);
      cacheSearchOptions('step.type', 'input', 'proxy.id', [mockOption2]);

      const configCached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      const inputCached = getCachedSearchOption('step.type', 'input', 'proxy.id', 'proxy-2');

      expect(configCached).toEqual(mockOption1);
      expect(inputCached).toEqual(mockOption2);
    });

    it('should handle different step types independently', () => {
      cacheSearchOptions('step.type1', 'config', 'proxy.id', [mockOption1]);
      cacheSearchOptions('step.type2', 'config', 'proxy.id', [mockOption2]);

      const cached1 = getCachedSearchOption('step.type1', 'config', 'proxy.id', 'proxy-1');
      const cached2 = getCachedSearchOption('step.type2', 'config', 'proxy.id', 'proxy-2');

      expect(cached1).toEqual(mockOption1);
      expect(cached2).toEqual(mockOption2);
    });
  });

  describe('getCachedSearchOption', () => {
    it('should return null for non-existent search cache', () => {
      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cached).toBeNull();
    });

    it('should find option by string value match', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cached).toEqual(mockOption1);
    });

    it('should find option by value equality', () => {
      const optionWithNumber: SelectionOption = {
        value: 123,
        label: 'Number Option',
      };
      cacheSearchOptions('step.type', 'config', 'port', [optionWithNumber]);

      const cached = getCachedSearchOption('step.type', 'config', 'port', 123);
      expect(cached).toEqual(optionWithNumber);
    });

    it('should find option when value is converted to string', () => {
      const optionWithNumber: SelectionOption = {
        value: 123,
        label: 'Number Option',
      };
      cacheSearchOptions('step.type', 'config', 'port', [optionWithNumber]);

      const cached = getCachedSearchOption('step.type', 'config', 'port', '123');
      expect(cached).toEqual(optionWithNumber);
    });

    it('should return null when value does not match any option', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1, mockOption2]);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'non-existent');
      expect(cached).toBeNull();
    });

    it('should handle multiple options and find the correct one', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [
        mockOption1,
        mockOption2,
        mockOption3,
      ]);

      const cached1 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      const cached2 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-2');
      const cached3 = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-3');

      expect(cached1).toEqual(mockOption1);
      expect(cached2).toEqual(mockOption2);
      expect(cached3).toEqual(mockOption3);
    });
  });

  describe('cache expiration', () => {
    it('should expire individual cached options after TTL', () => {
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      setCachedOption(key, mockOption1);

      jest.advanceTimersByTime(30 * 1000 + 1);

      const cached = getCachedOption(key);
      expect(cached).toBeNull();
    });

    it('should not expire search cache entries (they persist)', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);

      jest.advanceTimersByTime(30 * 1000 + 1);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cached).toEqual(mockOption1);
    });

    it('should expire individual options cached via cacheSearchOptions after TTL', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);

      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', 'proxy-1');
      jest.advanceTimersByTime(30 * 1000 + 1);

      const cachedViaKey = getCachedOption(key);
      expect(cachedViaKey).toBeNull();

      const cachedViaSearch = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cachedViaSearch).toEqual(mockOption1);
    });
  });

  describe('edge cases', () => {
    it('should handle options with null values', () => {
      const optionWithNull: SelectionOption = {
        value: null as any,
        label: 'Null Option',
      };
      cacheSearchOptions('step.type', 'config', 'proxy.id', [optionWithNull]);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', null);
      expect(cached).toEqual(optionWithNull);
    });

    it('should handle options with boolean values', () => {
      const optionWithBoolean: SelectionOption = {
        value: true,
        label: 'Boolean Option',
      };
      cacheSearchOptions('step.type', 'config', 'enabled', [optionWithBoolean]);

      const cached = getCachedSearchOption('step.type', 'config', 'enabled', true);
      expect(cached).toEqual(optionWithBoolean);
    });

    it('should handle options with object values', () => {
      const optionWithObject: SelectionOption = {
        value: { id: 'proxy-1', name: 'Proxy' },
        label: 'Object Option',
      };
      cacheSearchOptions('step.type', 'config', 'proxy', [optionWithObject]);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy', {
        id: 'proxy-1',
        name: 'Proxy',
      });
      expect(cached).toEqual(optionWithObject);
    });

    it('should handle very long cache keys', () => {
      const longValue = 'a'.repeat(1000);
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', longValue);
      const option: SelectionOption = {
        value: longValue,
        label: 'Long Value Option',
      };

      setCachedOption(key, option);
      const cached = getCachedOption(key);
      expect(cached).toEqual(option);
    });

    it('should handle special characters in cache keys', () => {
      const specialValue = 'proxy:id:with:colons';
      const key = getCacheKeyForValue('step.type', 'config', 'proxy.id', specialValue);
      const option: SelectionOption = {
        value: specialValue,
        label: 'Special Chars Option',
      };

      setCachedOption(key, option);
      const cached = getCachedOption(key);
      expect(cached).toEqual(option);
    });
  });
});
