/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';
import * as helpers from '..';
import { z } from '..';
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
    expect(strict.parse('x'.repeat(maxLength))).toHaveLength(maxLength);
    expect(() => strict.parse('x'.repeat(maxLength + 1))).toThrow();
    expect(() => strict.parse(42)).toThrow();
    expect(() => strict.parse(undefined)).toThrow();
    if (minLength > 0) {
      expect(() => strict.parse('')).toThrow();
    } else {
      expect(strict.parse('')).toBe('');
    }
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });

  test('reports only values above the limit and keeps minimum length validation', () => {
    const reporting = helper.warn({ label: 'dashboard.panelId' });
    expect(reporting.parse('x'.repeat(maxLength))).toHaveLength(maxLength);
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
    expect(reporting.parse('x'.repeat(maxLength + 1))).toHaveLength(maxLength + 1);
    expect(reportStringLengthViolation).toHaveBeenCalledTimes(1);
    expect(reportStringLengthViolation).toHaveBeenCalledWith({
      helper: name,
      library: 'zod',
      maxLength,
      label: 'dashboard.panelId',
    });
    expect(() => reporting.parse(42)).toThrow();
    if (minLength > 0) {
      expect(() => reporting.parse('')).toThrow();
    }
  });

  test('uses overrides in both enforcing and reporting modes', () => {
    expect(() => helper({ maxLength: 3 }).parse('four')).toThrow();
    expect(helper.warn({ maxLength: 3 }).parse('four')).toBe('four');
    expect(reportStringLengthViolation).toHaveBeenCalledWith(
      expect.objectContaining({ maxLength: 3 })
    );
    expect(() => helper.warn({ minLength: 3 }).parse('ab')).toThrow();
    expect(helper({ minLength: 0 }).parse('')).toBe('');
    expect(() => helper({ maxLength: undefined }).parse('x'.repeat(maxLength + 1))).toThrow();
  });

  test('provides ready-to-use schemas without mutating their strict bounds', () => {
    expect(readySchema.parse('abc')).toBe('abc');
    expect(readySchema.warn().parse('x'.repeat(maxLength + 1))).toHaveLength(maxLength + 1);
    expect(() => readySchema.parse('x'.repeat(maxLength + 1))).toThrow();
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
    expect(unbounded.parse('x'.repeat(200_000))).toHaveLength(200_000);
    expect(() => unbounded.parse('')).toThrow();
    expect(() => unbounded.parse(42)).toThrow();
    expect(reportStringLengthViolation).not.toHaveBeenCalled();
  });
});

test('supports composition, inference and refinement after warn()', () => {
  const requestSchema = z.object({
    id: helpers.savedObjectIdSchema.warn().regex(/^a+$/).optional(),
    description: helpers.descriptionSchema.nullable(),
  });
  type Request = z.infer<typeof requestSchema>;
  const input: Request = { id: 'a'.repeat(600), description: null };
  expect(requestSchema.parse(input)).toEqual(input);
  expect(requestSchema.parse({ description: null })).toEqual({ description: null });
  expect(() => requestSchema.parse({ id: 'b', description: null })).toThrow();
});

test('preserves custom Zod error options', () => {
  expect(() => helpers.savedObjectId({ error: 'Expected an ID' }).parse(42)).toThrow(
    'Expected an ID'
  );
  expect(() =>
    helpers.unboundedString({ reason: 'Trusted input', error: 'Expected text' }).parse(42)
  ).toThrow('Expected text');
});

test('exports accurate JSON Schema limits in both modes', () => {
  expect(z.toJSONSchema(helpers.savedObjectIdSchema)).toMatchObject({
    type: 'string',
    minLength: 1,
    maxLength: 512,
  });
  const reporting = z.toJSONSchema(helpers.savedObjectIdSchema.warn());
  expect(reporting).toMatchObject({ type: 'string', minLength: 1 });
  expect(reporting).not.toHaveProperty('maxLength');
});

test('does not promise warn() on schemas cloned by Zod modifiers', () => {
  const modified = helpers.savedObjectIdSchema.min(3);
  expectType<'warn' extends keyof typeof modified ? true : false>(false);
  expect(modified).not.toHaveProperty('warn');
  expect(() => modified.parse('ab')).toThrow();
  expect(modified.parse('abc')).toBe('abc');
});
