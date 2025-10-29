/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getMessageFieldWithFallbacks,
  getMessageFieldValueWithOtelFallback,
} from './get_message_field_with_fallbacks';

describe('getMessageFieldWithFallbacks', () => {
  it('should return message field object when it exists', () => {
    const doc = {
      message: 'log message',
    } as any;

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'message',
      value: 'log message',
      formattedValue: undefined,
    });
  });

  it('should return error.message when message does not exist', () => {
    const doc = {
      'error.message': 'error occurred',
    } as any;

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'error.message',
      value: 'error occurred',
      formattedValue: undefined,
    });
  });

  it('should return event.original when neither message nor error.message exist', () => {
    const doc = {
      'event.original': 'original event',
    } as any;

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'event.original',
      value: 'original event',
      formattedValue: undefined,
    });
  });

  it('should return undefined field when no message fields exist', () => {
    const doc = {
      'other.field': 'value',
    } as any;

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: undefined,
    });
  });

  it('should handle array values without extracting first element', () => {
    const doc = {
      message: ['message1', 'message2'],
    } as any;

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'message',
      value: ['message1', 'message2'],
      formattedValue: undefined,
    });
  });
});

describe('getMessageFieldValueWithOtelFallback', () => {
  it('should return message field with ECS field name', () => {
    const doc = {
      message: 'log message',
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: 'message',
      value: 'log message',
      formattedValue: undefined,
    });
  });

  it("should try OTel fallbacks when ECS fields don't exist", () => {
    const doc = {
      'other.field': 'value',
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: undefined,
    });
  });

  it('should fallback to error.message with field name', () => {
    const doc = {
      'error.message': 'error occurred',
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: 'error.message',
      value: 'error occurred',
      formattedValue: undefined,
    });
  });

  it('should fallback to event.original with field name', () => {
    const doc = {
      'event.original': 'original event',
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: 'event.original',
      value: 'original event',
      formattedValue: undefined,
    });
  });

  it('should return undefined for field when no message fields exist', () => {
    const doc = {
      'other.field': 'value',
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: undefined,
    });
  });

  it('should handle array values without extracting first element', () => {
    const doc = {
      message: ['message1', 'message2'],
    };

    const result = getMessageFieldValueWithOtelFallback(doc);
    expect(result).toEqual({
      field: 'message',
      value: ['message1', 'message2'],
      formattedValue: undefined,
    });
  });
});
