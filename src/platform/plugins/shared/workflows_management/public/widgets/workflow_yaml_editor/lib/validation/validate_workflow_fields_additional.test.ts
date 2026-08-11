/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NormalizableFieldSchema } from '@kbn/workflows/spec/lib/field_conversion';
import { makeWorkflowFieldsValidator, validateWorkflowFields } from './validate_workflow_fields';

describe('makeWorkflowFieldsValidator - additional', () => {
  it('returns an empty object schema when properties is undefined', () => {
    const fields: NormalizableFieldSchema = { type: 'object' };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({}).success).toBe(true);
  });

  it('creates a validator for array-type fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['tags'],
    };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({ tags: ['a', 'b'] }).success).toBe(true);
    expect(validator.safeParse({ tags: 'not-an-array' }).success).toBe(false);
  });

  it('creates a validator for numeric fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({ count: 42 }).success).toBe(true);
  });

  it('creates a validator for boolean fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({ enabled: true }).success).toBe(true);
    expect(validator.safeParse({ enabled: false }).success).toBe(true);
  });
});

describe('validateWorkflowFields - additional', () => {
  it('returns valid when values match all required fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    };
    const result = validateWorkflowFields({ name: 'Alice', age: 30 }, fields, 'input');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports error for missing required field in provided values', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    };
    const result = validateWorkflowFields({ name: 'Alice' }, fields, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('required'))).toBe(true);
  });

  it('returns valid when values is undefined and there are no required fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        optional: { type: 'string' },
      },
    };
    const result = validateWorkflowFields(undefined, fields, 'input');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports missing required fields when values is undefined and required exists', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    };
    const result = validateWorkflowFields(undefined, fields, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('id');
    expect(result.errors[0].message).toContain('name');
  });

  it('returns valid when normalized fields has no properties', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {},
    };
    const result = validateWorkflowFields({ anything: 'goes' }, fields, 'output');
    expect(result.isValid).toBe(true);
  });

  it('reports error with fieldName for type mismatch', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
      required: ['count'],
    };
    const result = validateWorkflowFields({ count: 'not a number' }, fields, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].fieldName).toBe('count');
  });

  it('strips "Invalid input: " prefix from error messages', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };
    const result = validateWorkflowFields({ name: 123 }, fields, 'input');
    expect(result.isValid).toBe(false);
    // Ensure the "Invalid input: " prefix is removed
    result.errors.forEach((e) => {
      expect(e.message).not.toMatch(/^Invalid input:\s*/);
    });
  });

  it('handles array field validation with wrong type provided', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' } },
      },
      required: ['items'],
    };
    const result = validateWorkflowFields({ items: 'not-an-array' }, fields, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('handles output fieldKind correctly in error messages', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
      required: ['result'],
    };
    const result = validateWorkflowFields(undefined, fields, 'output');
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain('outputs');
  });

  it('returns valid for extra properties not in the schema', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    // Extra properties should be allowed (passthrough)
    const result = validateWorkflowFields({ name: 'test', extra: 'value' }, fields, 'input');
    expect(result.isValid).toBe(true);
  });

  it('validates nested object fields', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            timeout: { type: 'number' },
          },
        },
      },
    };
    const result = validateWorkflowFields({ config: { timeout: 30 } }, fields, 'input');
    expect(result.isValid).toBe(true);
  });

  it('reports error for nested required field that is missing', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            timeout: { type: 'number' },
          },
          required: ['timeout'],
        },
      },
      required: ['config'],
    };
    const result = validateWorkflowFields({ config: {} }, fields, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('validates enum field type', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['level'],
    };
    const valid = validateWorkflowFields({ level: 'high' }, fields, 'input');
    expect(valid.isValid).toBe(true);

    const invalid = validateWorkflowFields({ level: 'extreme' }, fields, 'input');
    expect(invalid.isValid).toBe(false);
  });
});
