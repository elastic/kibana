/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SelectionDetails, SelectionOption } from '@kbn/workflows/types/v1';
import {
  cacheSearchOptions,
  clearCache,
  getCachedSearchOption,
  getCachedStepPropertyValidationOutcome,
  getStepPropertyValidationOutcomeCacheKey,
  setCachedStepPropertyValidationOutcome,
} from './step_property_selection_cache';
import type { StepPropertyItem } from '../../features/validate_workflow_yaml/model/types';

describe('step_property_selection_cache', () => {
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

  const mockDetails: SelectionDetails = { message: 'ok' };

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

  function makeItem(overrides: Partial<StepPropertyItem> = {}): StepPropertyItem {
    return {
      id: 'item-1',
      stepId: 'step-a',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
      yamlPath: ['x'],
      key: 'x',
      selectionHandler: {} as StepPropertyItem['selectionHandler'],
      context: {
        stepType: 'step.type',
        scope: 'config',
        propertyKey: 'proxy.id',
        values: { config: {}, input: {} },
      },
      propertyValue: 'proxy-1',
      propertyKey: 'proxy.id',
      stepType: 'step.type',
      scope: 'config',
      type: 'step-property',
      ...overrides,
    };
  }

  describe('getStepPropertyValidationOutcomeCacheKey', () => {
    it('should include step id, context fields, and serialized value', () => {
      const item = makeItem({
        stepId: 's1',
        propertyValue: 'v',
        context: {
          stepType: 't',
          scope: 'input',
          propertyKey: 'k',
          values: { config: { a: 1 }, input: {} },
        },
      });
      const key = getStepPropertyValidationOutcomeCacheKey(item);
      expect(key).toContain('s1');
      expect(key).toContain('t');
      expect(key).toContain('input');
      expect(key).toContain('k');
      expect(key).toContain(JSON.stringify({ config: { a: 1 }, input: {} }));
      expect(key).toContain('"v"');
    });

    it('should produce different keys for different property values', () => {
      const a = getStepPropertyValidationOutcomeCacheKey(makeItem({ propertyValue: 'a' }));
      const b = getStepPropertyValidationOutcomeCacheKey(makeItem({ propertyValue: 'b' }));
      expect(a).not.toBe(b);
    });
  });

  describe('getCachedStepPropertyValidationOutcome and setCachedStepPropertyValidationOutcome', () => {
    it('should store and retrieve validation outcome', () => {
      const key = 'k1';
      setCachedStepPropertyValidationOutcome(key, mockOption1, mockDetails);
      expect(getCachedStepPropertyValidationOutcome(key)).toEqual({
        resolvedOption: mockOption1,
        details: mockDetails,
      });
    });

    it('should return null for missing key', () => {
      expect(getCachedStepPropertyValidationOutcome('missing')).toBeNull();
    });

    it('should expire after TTL', () => {
      const key = 'k-exp';
      setCachedStepPropertyValidationOutcome(key, null, mockDetails);
      jest.advanceTimersByTime(30 * 1000 + 1);
      expect(getCachedStepPropertyValidationOutcome(key)).toBeNull();
    });

    it('should return outcome within TTL', () => {
      const key = 'k-ok';
      setCachedStepPropertyValidationOutcome(key, mockOption1, mockDetails);
      jest.advanceTimersByTime(30 * 1000 - 1);
      expect(getCachedStepPropertyValidationOutcome(key)?.resolvedOption).toEqual(mockOption1);
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

    it('should scope search cache by context values', () => {
      const valuesA = { config: { x: 1 }, input: {} };
      const valuesB = { config: { x: 2 }, input: {} };
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1], valuesA);
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption2], valuesB);

      expect(getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1', valuesA)).toEqual(
        mockOption1
      );
      expect(getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-2', valuesB)).toEqual(
        mockOption2
      );
      expect(
        getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1', valuesB)
      ).toBeNull();
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
    it('should not expire search cache entries by time (list persists until replaced)', () => {
      cacheSearchOptions('step.type', 'config', 'proxy.id', [mockOption1]);

      jest.advanceTimersByTime(30 * 1000 + 1);

      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', 'proxy-1');
      expect(cached).toEqual(mockOption1);
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

    it('should handle very long option values in search cache', () => {
      const longValue = 'a'.repeat(1000);
      const option: SelectionOption = {
        value: longValue,
        label: 'Long Value Option',
      };
      cacheSearchOptions('step.type', 'config', 'proxy.id', [option]);
      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', longValue);
      expect(cached).toEqual(option);
    });

    it('should handle special characters in values for search cache', () => {
      const specialValue = 'proxy:id:with:colons';
      const option: SelectionOption = {
        value: specialValue,
        label: 'Special Chars Option',
      };
      cacheSearchOptions('step.type', 'config', 'proxy.id', [option]);
      const cached = getCachedSearchOption('step.type', 'config', 'proxy.id', specialValue);
      expect(cached).toEqual(option);
    });
  });
});
