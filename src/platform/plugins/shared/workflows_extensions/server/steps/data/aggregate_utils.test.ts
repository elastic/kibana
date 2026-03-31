/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assignBucket,
  computeMetric,
  getFieldValue,
  groupItemsByKeys,
  parseGroupKeyValues,
} from './aggregate_utils';

const KEY_DELIMITER = '\0';

describe('getFieldValue', () => {
  it('should extract a top-level field', () => {
    expect(getFieldValue({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('should extract a nested field via dot notation', () => {
    expect(getFieldValue({ user: { name: 'Bob' } }, 'user.name')).toBe('Bob');
  });

  it('should return undefined for missing fields', () => {
    expect(getFieldValue({ a: 1 }, 'b')).toBeUndefined();
  });

  it('should return undefined for non-object items', () => {
    expect(getFieldValue('string', 'field')).toBeUndefined();
    expect(getFieldValue(null, 'field')).toBeUndefined();
    expect(getFieldValue(42, 'field')).toBeUndefined();
  });

  it('should return undefined when traversing through a non-object', () => {
    expect(getFieldValue({ a: 'not-object' }, 'a.b')).toBeUndefined();
  });
});

describe('computeMetric', () => {
  const items = [
    { value: 10, name: 'a' },
    { value: 20, name: 'b' },
    { value: 30, name: 'c' },
  ];

  it('should compute count', () => {
    expect(computeMetric(items, { name: 'count', operation: 'count' })).toBe(3);
  });

  it('should compute sum', () => {
    expect(computeMetric(items, { name: 'total', operation: 'sum', field: 'value' })).toBe(60);
  });

  it('should compute avg', () => {
    expect(computeMetric(items, { name: 'average', operation: 'avg', field: 'value' })).toBe(20);
  });

  it('should compute min', () => {
    expect(computeMetric(items, { name: 'minimum', operation: 'min', field: 'value' })).toBe(10);
  });

  it('should compute max', () => {
    expect(computeMetric(items, { name: 'maximum', operation: 'max', field: 'value' })).toBe(30);
  });

  it('should return null for non-numeric fields', () => {
    expect(computeMetric(items, { name: 'sum_name', operation: 'sum', field: 'name' })).toBeNull();
  });

  it('should skip NaN values', () => {
    const withNaN = [{ v: 5 }, { v: NaN }, { v: 15 }];
    expect(computeMetric(withNaN, { name: 'sum', operation: 'sum', field: 'v' })).toBe(20);
  });

  it('should return null for empty items with non-count operation', () => {
    expect(computeMetric([], { name: 'sum', operation: 'sum', field: 'value' })).toBeNull();
  });

  it('should return 0 for count of empty items', () => {
    expect(computeMetric([], { name: 'count', operation: 'count' })).toBe(0);
  });
});

describe('groupItemsByKeys', () => {
  const items = [
    { status: 'open', priority: 'high' },
    { status: 'closed', priority: 'low' },
    { status: 'open', priority: 'low' },
    { status: 'open', priority: 'high' },
  ];

  it('should group by a single key', () => {
    const groups = groupItemsByKeys(items, ['status']);
    expect(groups.size).toBe(2);
    expect(groups.get('"open"')?.length).toBe(3);
    expect(groups.get('"closed"')?.length).toBe(1);
  });

  it('should group by multiple keys', () => {
    const groups = groupItemsByKeys(items, ['status', 'priority']);
    expect(groups.size).toBe(3);
    expect(groups.get(`"open"${KEY_DELIMITER}"high"`)?.length).toBe(2);
    expect(groups.get(`"open"${KEY_DELIMITER}"low"`)?.length).toBe(1);
    expect(groups.get(`"closed"${KEY_DELIMITER}"low"`)?.length).toBe(1);
  });

  it('should handle field values containing the old :: delimiter', () => {
    const itemsWithDelimiter = [
      { status: 'open::urgent', priority: 'high' },
      { status: 'open::urgent', priority: 'high' },
      { status: 'closed', priority: 'low' },
    ];
    const groups = groupItemsByKeys(itemsWithDelimiter, ['status', 'priority']);
    expect(groups.size).toBe(2);
    const urgentGroup = groups.get(`"open::urgent"${KEY_DELIMITER}"high"`);
    expect(urgentGroup?.length).toBe(2);
  });

  it('should handle missing keys as undefined', () => {
    const groups = groupItemsByKeys([{ a: 1 }, { a: 1, b: 2 }], ['a', 'b']);
    expect(groups.size).toBe(2);
  });

  it('should handle empty items', () => {
    const groups = groupItemsByKeys([], ['key']);
    expect(groups.size).toBe(0);
  });

  it('should stop early when abort signal is fired', () => {
    const controller = new AbortController();
    controller.abort();
    const largeItems = Array.from({ length: 5000 }, (_, i) => ({ key: i }));
    const groups = groupItemsByKeys(largeItems, ['key'], controller.signal);
    expect(groups.size).toBe(0);
  });
});

describe('assignBucket', () => {
  const config = {
    field: 'age',
    ranges: [
      { to: 30, label: 'junior' },
      { from: 30, to: 50, label: 'mid' },
      { from: 50, label: 'senior' },
    ],
  };

  it('should assign to the correct bucket', () => {
    expect(assignBucket({ age: 25 }, config)).toBe('junior');
    expect(assignBucket({ age: 35 }, config)).toBe('mid');
    expect(assignBucket({ age: 60 }, config)).toBe('senior');
  });

  it('should handle boundary values (from is inclusive, to is exclusive)', () => {
    expect(assignBucket({ age: 30 }, config)).toBe('mid');
    expect(assignBucket({ age: 50 }, config)).toBe('senior');
  });

  it('should return null for non-numeric values', () => {
    expect(assignBucket({ age: 'old' }, config)).toBeNull();
  });

  it('should return null for NaN', () => {
    expect(assignBucket({ age: NaN }, config)).toBeNull();
  });

  it('should return null for missing field', () => {
    expect(assignBucket({ name: 'test' }, config)).toBeNull();
  });

  it('should generate label from range when label is not provided', () => {
    const unlabeledConfig = {
      field: 'score',
      ranges: [{ to: 50 }, { from: 50, to: 100 }, { from: 100 }],
    };
    expect(assignBucket({ score: 25 }, unlabeledConfig)).toBe('<50');
    expect(assignBucket({ score: 75 }, unlabeledConfig)).toBe('50-100');
    expect(assignBucket({ score: 150 }, unlabeledConfig)).toBe('100+');
  });
});

describe('parseGroupKeyValues', () => {
  it('should parse a single key', () => {
    expect(parseGroupKeyValues('"open"', ['status'])).toEqual({ status: 'open' });
  });

  it('should parse multiple keys', () => {
    expect(parseGroupKeyValues(`"open"${KEY_DELIMITER}"high"`, ['status', 'priority'])).toEqual({
      status: 'open',
      priority: 'high',
    });
  });

  it('should parse numeric values', () => {
    expect(parseGroupKeyValues('42', ['id'])).toEqual({ id: 42 });
  });

  it('should handle null values', () => {
    expect(parseGroupKeyValues('null', ['field'])).toEqual({ field: null });
  });

  it('should handle values containing :: in them', () => {
    expect(parseGroupKeyValues('"open::urgent"', ['status'])).toEqual({
      status: 'open::urgent',
    });
  });
});
