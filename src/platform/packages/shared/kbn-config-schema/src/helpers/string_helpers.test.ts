/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  schema,
  metaFields,
  savedObjectId,
  savedObjectType,
  savedObjectVersion,
  spaceId,
  displayName,
  description,
  searchFilter,
  aggregation,
  querySortField,
  urlString,
  pemCertificate,
  version,
  boundedString,
  unboundedString,
} from '../..';
import { reportStringLengthViolation } from '@kbn/schema-string-helpers';

jest.mock('@kbn/schema-string-helpers', () => ({
  ...jest.requireActual('@kbn/schema-string-helpers'),
  reportStringLengthViolation: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['savedObjectId', savedObjectId, 1, 512],
  ['savedObjectType', savedObjectType, 1, 256],
  ['savedObjectVersion', savedObjectVersion, 1, 256],
  ['spaceId', spaceId, 1, 512],
  ['displayName', displayName, 1, 1024],
  ['description', description, 0, 10000],
  ['searchFilter', searchFilter, 0, 10000],
  ['aggregation', aggregation, 0, 100000],
  ['querySortField', querySortField, 0, 256],
  ['urlString', urlString, 1, 2048],
  ['pemCertificate', pemCertificate, 1, 262144],
  ['version', version, 1, 256],
] as const)('%s', (name, helper, minLength, maxLength) => {
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
      length: maxLength + 1,
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

  test('creates reporting schemas without changing strict schemas or future defaults', () => {
    const strict = helper();
    expect(strict.validate('abc')).toBe('abc');
    expect(helper.warn().validate('x'.repeat(maxLength + 1))).toHaveLength(maxLength + 1);
    expect(() => strict.validate('x'.repeat(maxLength + 1))).toThrow();
    expect(() => helper().validate('x'.repeat(maxLength + 1))).toThrow();
  });
});

describe('unboundedString', () => {
  test.each(['', '  ', '\n\t'])('rejects an empty reason %j at definition time', (reason) => {
    expect(() => unboundedString({ reason })).toThrow('requires a non-empty reason');
  });

  test.each([-1, -0.5, 1.5, Infinity, NaN])(
    'rejects invalid minLength %j at definition time',
    (minLength) => {
      expect(() => unboundedString({ reason: 'valid reason', minLength })).toThrow(
        'requires a non-negative integer minLength'
      );
    }
  );

  test('accepts large strings, preserves minimum length and validates the input type', () => {
    const unbounded = unboundedString({
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
  expect(reporting.getSchema().describe()).toMatchObject({ flags: { description: 'An ID' } });
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

describe('boundedString', () => {
  test('enforces the required maximum and defaults the minimum to zero', () => {
    const strict = boundedString({ maxLength: 4 });
    expect(strict.validate('four')).toBe('four');
    expect(strict.validate('')).toBe('');
    expect(() => strict.validate('fives')).toThrow();
    expect(() => boundedString({ minLength: 2, maxLength: 4 }).validate('a')).toThrow();
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });

  test('reports values above the maximum under the boundedString helper name', () => {
    const reporting = boundedString.warn({ maxLength: 4, label: 'fleet.output.ca_file' });
    expect(reporting.validate('four')).toBe('four');
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
    expect(reporting.validate('fives')).toBe('fives');
    expect(reportStringLengthViolation).toHaveBeenCalledWith({
      helper: 'boundedString',
      library: 'config-schema',
      maxLength: 4,
      length: 5,
      label: 'fleet.output.ca_file',
    });
  });

  test.each([undefined, NaN, Infinity, -1, 1.5])(
    'rejects an invalid maximum %s at definition time',
    (maxLength) => {
      expect(() => boundedString({ maxLength: maxLength as number })).toThrow(
        'boundedString() requires'
      );
    }
  );

  test('rejects a maximum above the ceiling at definition time', () => {
    expect(() => boundedString({ maxLength: 1_048_576 })).not.toThrow();
    expect(() => boundedString({ maxLength: 1_048_577 })).toThrow('maxLength <= 1048576');
    expect(() => boundedString.warn({ maxLength: 1_048_577, label: 'test' })).toThrow(
      'maxLength <= 1048576'
    );
  });

  test.each(['', '  '])('requires a non-empty label %j in reporting mode', (label) => {
    expect(() => boundedString.warn({ maxLength: 4, label })).toThrow(
      'boundedString.warn() requires a non-empty label'
    );
  });
});
