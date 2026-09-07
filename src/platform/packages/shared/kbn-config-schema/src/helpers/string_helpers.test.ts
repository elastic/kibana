/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../..';
import { schema, metaFields } from '../..';
import { reportStringLengthViolation } from '@kbn/schema-string-helpers';

jest.mock('@kbn/schema-string-helpers', () => ({
  ...jest.requireActual('@kbn/schema-string-helpers'),
  reportStringLengthViolation: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['savedObjectId', 1, 512],
  ['savedObjectType', 0, 256],
  ['savedObjectVersion', 0, 256],
  ['spaceId', 1, 512],
  ['displayName', 1, 1024],
  ['description', 0, 10000],
  ['searchFilter', 0, 10000],
  ['aggregation', 0, 100000],
  ['querySortField', 0, 256],
] as const)('%s', (name, minLength, maxLength) => {
  const helper = helpers[name];
  const readySchema = helpers[`${name}Schema`];

  test('enforces the default boundaries and string type', () => {
    const strict = helper();
    expect(strict.validate('x'.repeat(maxLength))).toHaveLength(maxLength);
    expect(() => strict.validate('x'.repeat(maxLength + 1))).toThrow();
    expect(() => strict.validate(42)).toThrow();
    expect(() => strict.validate(undefined)).toThrow();
    if (minLength > 0) {
      expect(() => strict.validate('')).toThrow();
    } else {
      expect(strict.validate('')).toBe('');
    }
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });

  test('reports only values above the limit and keeps minimum length validation', () => {
    const reporting = helper.warn({ label: 'dashboard.panelId' });
    expect(reporting.validate('x'.repeat(maxLength))).toHaveLength(maxLength);
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
    expect(reporting.validate('x'.repeat(maxLength + 1))).toHaveLength(maxLength + 1);
    expect(reportStringLengthViolation).toHaveBeenCalledTimes(1);
    expect(reportStringLengthViolation).toHaveBeenCalledWith({
      helper: name,
      library: 'config-schema',
      maxLength,
      label: 'dashboard.panelId',
    });
    expect(() => reporting.validate(42)).toThrow();
    if (minLength > 0) {
      expect(() => reporting.validate('')).toThrow();
    }
  });

  test('uses overrides in both enforcing and reporting modes', () => {
    expect(() => helper({ maxLength: 3 }).validate('four')).toThrow();
    expect(helper.warn({ maxLength: 3 }).validate('four')).toBe('four');
    expect(reportStringLengthViolation).toHaveBeenCalledWith(
      expect.objectContaining({ maxLength: 3 })
    );
    expect(() => helper.warn({ minLength: 3 }).validate('ab')).toThrow();
    expect(helper({ minLength: 0 }).validate('')).toBe('');
    expect(() => helper({ maxLength: undefined }).validate('x'.repeat(maxLength + 1))).toThrow();
  });

  test('provides ready-to-use schemas without mutating their strict bounds', () => {
    expect(readySchema.validate('abc')).toBe('abc');
    expect(readySchema.warn().validate('x'.repeat(maxLength + 1))).toHaveLength(maxLength + 1);
    expect(() => readySchema.validate('x'.repeat(maxLength + 1))).toThrow();
  });
});

describe('unboundedString', () => {
  test.each(['', '  ', '\n\t'])('rejects an empty reason %j at definition time', (reason) => {
    expect(() => helpers.unboundedString({ reason })).toThrow('requires a non-empty reason');
  });

  test('accepts large strings, preserves minimum length and validates the input type', () => {
    const unbounded = helpers.unboundedString({
      reason: 'Size is enforced upstream',
      minLength: 1,
    });
    expect(unbounded.validate('x'.repeat(200_000))).toHaveLength(200_000);
    expect(() => unbounded.validate('')).toThrow();
    expect(() => unbounded.validate(42)).toThrow();
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });
});

test('exposes helpers on schema and composes with optional fields', () => {
  const requestSchema = schema.object({
    id: schema.savedObjectId(),
    description: schema.maybe(schema.description()),
  });
  expect(requestSchema.validate({ id: 'abc' })).toEqual({ id: 'abc' });
  expect(() => requestSchema.validate({ id: '' })).toThrow();
});

test('preserves custom validation, coercion, defaults and metadata in reporting mode', () => {
  const validate = jest.fn((value: string) =>
    value.startsWith('x') ? 'invalid prefix' : undefined
  );
  const reporting = schema.savedObjectId.warn({
    maxLength: 2,
    validate,
    coerceFromNumber: true,
    defaultValue: 'id',
    meta: { description: 'An ID' },
  });
  expect(reporting.validate(123)).toBe('123');
  expect(validate).toHaveBeenCalledWith('123');
  expect(() => reporting.validate('xxx')).toThrow('invalid prefix');
  expect(reporting.validate(undefined)).toBe('id');
  expect(reporting.getSchema().describe().flags?.description).toBe('An ID');
});

test('exports accurate OpenAPI length metadata in both modes', () => {
  const strict = schema.savedObjectId().getSchema().describe();
  expect(strict.metas).toEqual(
    expect.arrayContaining([
      { [metaFields.META_FIELD_X_OAS_MIN_LENGTH]: 1 },
      { [metaFields.META_FIELD_X_OAS_MAX_LENGTH]: 512 },
    ])
  );
  const reporting = schema.savedObjectId.warn().getSchema().describe();
  expect(reporting.metas).not.toEqual(
    expect.arrayContaining([{ [metaFields.META_FIELD_X_OAS_MAX_LENGTH]: 512 }])
  );
});
