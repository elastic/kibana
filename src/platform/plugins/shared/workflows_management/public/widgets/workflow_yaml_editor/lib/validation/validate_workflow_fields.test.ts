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

describe('makeWorkflowFieldsValidator', () => {
  it('returns a Zod validator for JSON Schema field definitions', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({ name: 'test' }).success).toBe(true);
    expect(validator.safeParse({}).success).toBe(false);
  });

  it('returns an empty object schema when no properties exist', () => {
    const fields: NormalizableFieldSchema = {
      type: 'object',
      properties: {},
    };
    const validator = makeWorkflowFieldsValidator(fields);
    expect(validator.safeParse({}).success).toBe(true);
  });
});

describe('validateWorkflowFields', () => {
  const fieldsWithRequired: NormalizableFieldSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      count: { type: 'number' },
    },
    required: ['name'],
  };

  it('returns valid for correct input', () => {
    const result = validateWorkflowFields({ name: 'test', count: 5 }, fieldsWithRequired, 'input');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid when targetFields is undefined', () => {
    const result = validateWorkflowFields({ name: 'test' }, undefined, 'input');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid when properties are empty', () => {
    const emptyFields: NormalizableFieldSchema = {
      type: 'object',
      properties: {},
    };
    const result = validateWorkflowFields(undefined, emptyFields, 'input');
    expect(result.isValid).toBe(true);
  });

  it('reports missing required fields when values are undefined', () => {
    const result = validateWorkflowFields(undefined, fieldsWithRequired, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Missing required inputs');
    expect(result.errors[0].message).toContain('name');
  });

  it('uses "outputs" in error message for output field kind', () => {
    const result = validateWorkflowFields(undefined, fieldsWithRequired, 'output');
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain('Missing required outputs');
  });

  it('reports type validation errors', () => {
    const result = validateWorkflowFields({ name: 123 }, fieldsWithRequired, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('reports missing required fields in values', () => {
    const result = validateWorkflowFields({}, fieldsWithRequired, 'input');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
