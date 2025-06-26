/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeString, normalizeObject, normalizeDate } from './utils';

describe('normalizeString', () => {
  test('should return undefined for non string input', async () => {
    expect(normalizeString({})).toBe(undefined);
    expect(normalizeString(12344)).toBe(undefined);
    expect(normalizeString(null)).toBe(undefined);
  });

  test('should return the string for string input', async () => {
    expect(normalizeString('logstash')).toBe('logstash');
  });
});

describe('normalizeDate', () => {
  test('should return timestamp if timestamp is given', async () => {
    expect(normalizeDate(1654702414)).toBe(1654702414);
  });

  test('should return null if NaN is given', async () => {
    expect(normalizeDate(NaN)).toBe(null);
  });

  test('should return date if a date object is given', async () => {
    const date = Date.now();
    expect(normalizeDate(date)).toBe(date);
  });

  test('should return undefined for a string', async () => {
    expect(normalizeDate('test')).toBe('test');
  });

  test('should return the object if object is given', async () => {
    expect(normalizeDate({ test: 'test' })).toStrictEqual({ test: 'test' });
  });
});

describe('normalizeObject', () => {
  test('should throw if a function is given as the object property', async () => {
    expect(() => {
      normalizeObject({ toJSON: () => alert('gotcha') });
    }).toThrow('a function cannot be used as a property name');
  });

  test('should throw if a function is given on a nested object', async () => {
    expect(() => {
      normalizeObject({ test: { toJSON: () => alert('gotcha') } });
    }).toThrow('a function cannot be used as a property name');
  });

  test('should return null for null', async () => {
    expect(normalizeObject(null)).toBe(null);
  });

  test('should return null for undefined', async () => {
    expect(normalizeObject(undefined)).toBe(null);
  });

  test('should return the object', async () => {
    expect(normalizeObject({ test: 'test' })).toStrictEqual({ test: 'test' });
  });
});
