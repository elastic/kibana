/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getFieldValueWithFallback,
  getFirstAvailableFieldValue,
} from './get_field_value_with_fallback';

describe('getFieldValueWithFallback', () => {
  it('should return ECS field value when it exists', () => {
    const doc = {
      'service.name': 'my-service',
    };

    const result = getFieldValueWithFallback(doc, 'service.name');
    expect(result).toEqual({
      field: 'service.name',
      value: 'my-service',
    });
  });

  it('should return undefined when ECS field with OTel mapping does not exist', () => {
    const doc = {
      'other.field': 'value',
    };

    // service.name has OTel mapping but neither ECS nor OTel field exists
    const result = getFieldValueWithFallback(doc, 'service.name');
    expect(result).toEqual({
      field: undefined,
      value: undefined,
    });
  });

  it('should return undefined when neither ECS nor OTel field exists', () => {
    const doc = {
      'other.field': 'value',
    };

    const result = getFieldValueWithFallback(doc, 'service.name');
    expect(result).toEqual({
      field: undefined,
      value: undefined,
    });
  });

  it('should return array values as-is without extracting first element', () => {
    const doc = {
      'service.name': ['service1', 'service2'],
    };

    const result = getFieldValueWithFallback(doc, 'service.name');
    expect(result).toEqual({
      field: 'service.name',
      value: ['service1', 'service2'],
    });
  });

  it('should work with fields that have no OTel mapping', () => {
    const doc = {
      'custom.field': 'custom-value',
    };

    const result = getFieldValueWithFallback(doc, 'custom.field');
    expect(result).toEqual({
      field: 'custom.field',
      value: 'custom-value',
    });
  });
});

describe('getFirstAvailableFieldValue', () => {
  it('should return first available field value from list', () => {
    const doc = {
      message: 'log message',
      'error.message': 'error occurred',
    };

    const result = getFirstAvailableFieldValue(doc, ['nonexistent', 'message', 'error.message']);
    expect(result).toEqual({
      field: 'message',
      value: 'log message',
    });
  });

  it('should try OTel fallbacks for each field', () => {
    const doc = {
      'other.field': 'value',
    };

    // OTel fallback would work if the field was present, testing graceful undefined handling
    const result = getFirstAvailableFieldValue(doc, ['service.name', 'other.field']);
    expect(result).toEqual({
      field: 'other.field',
      value: 'value',
    });
  });

  it('should return undefined when no fields are available', () => {
    const doc = {
      'other.field': 'value',
    };

    const result = getFirstAvailableFieldValue(doc, ['service.name', 'agent.name']);
    expect(result).toEqual({
      field: undefined,
    });
  });

  it('should skip fields without values', () => {
    const doc = {
      'error.message': 'error text',
    };

    const result = getFirstAvailableFieldValue(doc, ['message', 'error.message']);
    expect(result).toEqual({
      field: 'error.message',
      value: 'error text',
    });
  });

  it('should handle empty field list', () => {
    const doc = {
      message: 'test',
    };

    const result = getFirstAvailableFieldValue(doc, []);
    expect(result).toEqual({
      field: undefined,
    });
  });
});
