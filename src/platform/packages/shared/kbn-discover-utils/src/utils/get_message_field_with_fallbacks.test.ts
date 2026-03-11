/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMessageFieldWithFallbacks } from './get_message_field_with_fallbacks';

describe('getMessageFieldWithFallbacks', () => {
  it('should return message field object when it exists', () => {
    const doc = {
      message: 'log message',
    };

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
    };

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
    };

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
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: undefined,
    });
  });

  it('should handle array values by converting to string', () => {
    const doc = {
      message: ['message1', 'message2'],
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'message',
      value: 'message1,message2',
      formattedValue: undefined,
    });
  });

  it('should use OTel fallback body.text when message is not present', () => {
    const doc = {
      'body.text': 'OTel log message',
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'body.text',
      value: 'OTel log message',
      formattedValue: undefined,
    });
  });

  it('should handle includeFormattedValue option for valid JSON', () => {
    const doc = {
      message: '{"key":"value"}',
    };

    const result = getMessageFieldWithFallbacks(doc, { includeFormattedValue: true });
    expect(result).toEqual({
      field: 'message',
      value: '{"key":"value"}',
      formattedValue: '{\n  "key": "value"\n}',
    });
  });

  it('should not format non-JSON values', () => {
    const doc = {
      message: 'plain text message',
    };

    const result = getMessageFieldWithFallbacks(doc, { includeFormattedValue: true });
    expect(result).toEqual({
      field: 'message',
      value: 'plain text message',
      formattedValue: undefined,
    });
  });

  it('should return body.text field object when it exists (highest priority)', () => {
    const doc = {
      'body.text': 'OTel log message',
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'body.text',
      value: 'OTel log message',
      formattedValue: undefined,
    });
  });

  it('should prefer OTel body.text over ECS message', () => {
    const doc = {
      message: 'ECS message',
      'body.text': 'OTel message',
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'body.text',
      value: 'OTel message',
      formattedValue: undefined,
    });
  });

  it('should return message field when body.text does not exist', () => {
    const doc = {
      message: 'log message',
    };

    const result = getMessageFieldWithFallbacks(doc);
    expect(result).toEqual({
      field: 'message',
      value: 'log message',
      formattedValue: undefined,
    });
  });
});
