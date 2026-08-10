/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  savedObjectId,
  spaceId,
  displayName,
  description,
  searchFilter,
  aggregation,
  unboundedString,
  registerSchemaViolationReporter,
} from './schema_helpers';

// ---------------------------------------------------------------------------
// savedObjectId
// ---------------------------------------------------------------------------

describe('savedObjectId', () => {
  test('accepts a valid id', () => {
    expect(savedObjectId().validate('abc-123')).toBe('abc-123');
  });

  test('rejects empty string', () => {
    expect(() => savedObjectId().validate('')).toThrow();
  });

  test('rejects value over 512 chars', () => {
    expect(() => savedObjectId().validate('a'.repeat(513))).toThrow(
      'value has length [513] but it must have a maximum length of [512]'
    );
  });

  test('accepts exactly 512 chars', () => {
    expect(savedObjectId().validate('a'.repeat(512))).toHaveLength(512);
  });

  test('caller can tighten maxLength', () => {
    expect(() => savedObjectId({ maxLength: 10 }).validate('a'.repeat(11))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// spaceId
// ---------------------------------------------------------------------------

describe('spaceId', () => {
  test('accepts a valid space id', () => {
    expect(spaceId().validate('my-space')).toBe('my-space');
  });

  test('rejects empty string', () => {
    expect(() => spaceId().validate('')).toThrow();
  });

  test('rejects value over 512 chars', () => {
    expect(() => spaceId().validate('x'.repeat(513))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// displayName
// ---------------------------------------------------------------------------

describe('displayName', () => {
  test('accepts a valid name', () => {
    expect(displayName().validate('My Dashboard')).toBe('My Dashboard');
  });

  test('rejects empty string', () => {
    expect(() => displayName().validate('')).toThrow();
  });

  test('rejects value over 1024 chars', () => {
    expect(() => displayName().validate('a'.repeat(1025))).toThrow(
      'value has length [1025] but it must have a maximum length of [1024]'
    );
  });
});

// ---------------------------------------------------------------------------
// description
// ---------------------------------------------------------------------------

describe('description', () => {
  test('accepts empty string', () => {
    expect(description().validate('')).toBe('');
  });

  test('rejects value over 10000 chars', () => {
    expect(() => description().validate('a'.repeat(10001))).toThrow(
      'value has length [10001] but it must have a maximum length of [10000]'
    );
  });
});

// ---------------------------------------------------------------------------
// searchFilter
// ---------------------------------------------------------------------------

describe('searchFilter', () => {
  test('accepts a KQL expression', () => {
    expect(searchFilter().validate('status:open AND type:alert')).toBe(
      'status:open AND type:alert'
    );
  });

  test('rejects value over 10000 chars', () => {
    expect(() => searchFilter().validate('a'.repeat(10001))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// aggregation
// ---------------------------------------------------------------------------

describe('aggregation', () => {
  test('accepts a large JSON aggregation', () => {
    const big = JSON.stringify({ aggs: { terms: { field: 'host' } } });
    expect(aggregation().validate(big)).toBe(big);
  });

  test('rejects value over 100000 chars', () => {
    expect(() => aggregation().validate('a'.repeat(100001))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// unboundedString
// ---------------------------------------------------------------------------

describe('unboundedString', () => {
  test('returns a string type with no maxLength', () => {
    const huge = 'x'.repeat(200000);
    expect(
      unboundedString({ reason: 'stored in object store, size enforced upstream' }).validate(huge)
    ).toBe(huge);
  });

  test('throws at definition time if reason is empty', () => {
    expect(() => unboundedString({ reason: '' })).toThrow(
      'schema.unboundedString() requires a non-empty reason'
    );
  });

  test('throws at definition time if reason is whitespace only', () => {
    expect(() => unboundedString({ reason: '   ' })).toThrow(
      'schema.unboundedString() requires a non-empty reason'
    );
  });

  test('forwards other StringOptions (e.g. minLength)', () => {
    expect(() => unboundedString({ reason: 'test', minLength: 5 }).validate('ab')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// .warn() mode + SchemaViolationReporter
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
    expect(savedObjectId.warn().validate(over)).toBe(over);
  });

  test('calls reporter with helper name and lengths when value is too long', () => {
    savedObjectId.warn().validate('a'.repeat(600));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ helper: 'savedObjectId', length: 600, maxLength: 512 });
  });

  test('does not call reporter when value is within the default maxLength', () => {
    savedObjectId.warn().validate('a'.repeat(10));
    expect(reports).toHaveLength(0);
  });

  test('warn() caller can tighten minLength without affecting warn logic', () => {
    expect(() => savedObjectId.warn({ minLength: 5 }).validate('ab')).toThrow();
  });

  test('warn() on displayName reports correctly', () => {
    displayName.warn().validate('a'.repeat(1025));
    expect(reports[0]).toMatchObject({ helper: 'displayName', maxLength: 1024 });
  });

  test('passes label through to reporter', () => {
    savedObjectId.warn({ label: 'dashboard.panelId' }).validate('a'.repeat(600));
    expect(reports[0]).toMatchObject({ helper: 'savedObjectId', label: 'dashboard.panelId' });
  });

  test('label is undefined when not provided', () => {
    savedObjectId.warn().validate('a'.repeat(600));
    expect(reports[0].label).toBeUndefined();
  });
});
