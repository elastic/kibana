/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  savedObjectIdSchema,
  spaceIdSchema,
  displayNameSchema,
  descriptionSchema,
  searchFilterSchema,
  aggregationSchema,
  unboundedString,
  deduplicatedArrayOf,
} from './zod_helpers';
import { registerSchemaViolationReporter } from './violation_reporter';
import { z } from '@kbn/zod';

// ---------------------------------------------------------------------------
// Pre-built string schemas
// ---------------------------------------------------------------------------

describe('savedObjectIdSchema', () => {
  test('accepts a valid id', () => {
    expect(savedObjectIdSchema.parse('abc-123')).toBe('abc-123');
  });

  test('rejects empty string', () => {
    expect(() => savedObjectIdSchema.parse('')).toThrow();
  });

  test('rejects value over 512 chars', () => {
    expect(() => savedObjectIdSchema.parse('a'.repeat(513))).toThrow();
  });

  test('accepts exactly 512 chars', () => {
    expect(savedObjectIdSchema.parse('a'.repeat(512))).toHaveLength(512);
  });
});

describe('spaceIdSchema', () => {
  test('accepts a valid space id', () => {
    expect(spaceIdSchema.parse('my-space')).toBe('my-space');
  });

  test('rejects empty string', () => {
    expect(() => spaceIdSchema.parse('')).toThrow();
  });

  test('rejects value over 512 chars', () => {
    expect(() => spaceIdSchema.parse('x'.repeat(513))).toThrow();
  });
});

describe('displayNameSchema', () => {
  test('accepts a valid name', () => {
    expect(displayNameSchema.parse('My Dashboard')).toBe('My Dashboard');
  });

  test('rejects empty string', () => {
    expect(() => displayNameSchema.parse('')).toThrow();
  });

  test('rejects value over 1024 chars', () => {
    expect(() => displayNameSchema.parse('a'.repeat(1025))).toThrow();
  });
});

describe('descriptionSchema', () => {
  test('accepts empty string', () => {
    expect(descriptionSchema.parse('')).toBe('');
  });

  test('rejects value over 10000 chars', () => {
    expect(() => descriptionSchema.parse('a'.repeat(10001))).toThrow();
  });
});

describe('searchFilterSchema', () => {
  test('accepts a KQL expression', () => {
    expect(searchFilterSchema.parse('status:open')).toBe('status:open');
  });

  test('rejects value over 10000 chars', () => {
    expect(() => searchFilterSchema.parse('a'.repeat(10001))).toThrow();
  });
});

describe('aggregationSchema', () => {
  test('accepts a large aggregation string', () => {
    const big = 'a'.repeat(100000);
    expect(aggregationSchema.parse(big)).toBe(big);
  });

  test('rejects value over 100000 chars', () => {
    expect(() => aggregationSchema.parse('a'.repeat(100001))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// .warn() report-only mode
// ---------------------------------------------------------------------------

describe('.warn() report-only mode', () => {
  let reports: Array<{ helper: string; length: number; maxLength: number }>;

  beforeEach(() => {
    reports = [];
    registerSchemaViolationReporter({ report: (info) => reports.push(info) });
  });

  afterEach(() => {
    registerSchemaViolationReporter({ report: () => {} });
  });

  test('does not throw when value exceeds the default maxLength', () => {
    const over = 'a'.repeat(600);
    expect(savedObjectIdSchema.warn().parse(over)).toBe(over);
  });

  test('calls reporter with helper name and lengths when value is too long', () => {
    savedObjectIdSchema.warn().parse('a'.repeat(600));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ helper: 'savedObjectId', length: 600, maxLength: 512 });
  });

  test('does not call reporter when value is within the default maxLength', () => {
    savedObjectIdSchema.warn().parse('a'.repeat(10));
    expect(reports).toHaveLength(0);
  });

  test('still enforces min in warn mode', () => {
    expect(() => savedObjectIdSchema.warn().parse('')).toThrow();
  });

  test('warn() on displayName reports correctly', () => {
    displayNameSchema.warn().parse('a'.repeat(1025));
    expect(reports[0]).toMatchObject({ helper: 'displayName', maxLength: 1024 });
  });

  test('single registerSchemaViolationReporter call covers both schema and zod helpers', () => {
    savedObjectIdSchema.warn().parse('a'.repeat(600));
    expect(reports).toHaveLength(1);
  });

  test('passes label through to reporter', () => {
    savedObjectIdSchema.warn({ label: 'dashboard.panelId' }).parse('a'.repeat(600));
    expect(reports[0]).toMatchObject({ helper: 'savedObjectId', label: 'dashboard.panelId' });
  });

  test('label is undefined when not provided', () => {
    savedObjectIdSchema.warn().parse('a'.repeat(600));
    expect(reports[0].label).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// unboundedString
// ---------------------------------------------------------------------------

describe('unboundedString (Zod)', () => {
  test('returns a schema that accepts any length string', () => {
    const huge = 'x'.repeat(200000);
    expect(unboundedString('stored in object store').parse(huge)).toBe(huge);
  });

  test('throws at definition time if reason is empty', () => {
    expect(() => unboundedString('')).toThrow('unboundedString() requires a non-empty reason');
  });

  test('throws at definition time if reason is whitespace only', () => {
    expect(() => unboundedString('   ')).toThrow('unboundedString() requires a non-empty reason');
  });
});

// ---------------------------------------------------------------------------
// deduplicatedArrayOf
// ---------------------------------------------------------------------------

describe('deduplicatedArrayOf', () => {
  const schema = deduplicatedArrayOf(z.string());

  test('passes through an array with no duplicates', () => {
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('removes duplicate entries', () => {
    expect(schema.parse(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  test('works with number items', () => {
    const numSchema = deduplicatedArrayOf(z.number());
    expect(numSchema.parse([1, 2, 1])).toEqual([1, 2]);
  });

  test('accepts an empty array', () => {
    expect(schema.parse([])).toEqual([]);
  });
});
