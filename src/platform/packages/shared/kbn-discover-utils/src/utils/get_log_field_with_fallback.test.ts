/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogFieldWithFallback } from './get_log_field_with_fallback';
import type { LogDocumentOverview } from '../types';

describe('getLogFieldWithFallback', () => {
  const createBaseDoc = (): LogDocumentOverview => ({
    '@timestamp': '2024-01-15T10:30:00Z',
    'data_stream.namespace': 'default',
    'data_stream.dataset': 'logs',
  });

  describe('basic field retrieval', () => {
    it('returns the first non-null value from the ranking order', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'log.level': 'info',
        message: 'test message',
      };

      const result = getLogFieldWithFallback(doc, ['log.level', 'message'] as const);

      expect(result).toEqual({
        field: 'log.level',
        value: 'info',
      });
    });

    it('returns the first truthy value even if later values exist', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'log.level': 'info',
        message: 'test message',
        'error.message': 'error message',
      };

      const result = getLogFieldWithFallback(doc, [
        'log.level',
        'message',
        'error.message',
      ] as const);

      expect(result).toEqual({
        field: 'log.level',
        value: 'info',
      });
    });
  });

  describe('fallback behavior', () => {
    it('skips null values and returns the next available field', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'log.level': null as any,
        message: 'test message',
      };

      const result = getLogFieldWithFallback(doc, ['log.level', 'message'] as const);

      expect(result).toEqual({
        field: 'message',
        value: 'test message',
      });
    });

    it('skips undefined values and returns the next available field', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: 'test message',
      };

      const result = getLogFieldWithFallback(doc, ['log.level', 'message'] as const);

      expect(result).toEqual({
        field: 'message',
        value: 'test message',
      });
    });

    it('returns undefined field when all values in ranking order are null or undefined', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
      };

      const result = getLogFieldWithFallback(doc, ['log.level', 'message'] as const);

      expect(result).toEqual({
        field: undefined,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty ranking order array', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'log.level': 'info',
      };

      const result = getLogFieldWithFallback(doc, [] as const);

      expect(result).toEqual({
        field: undefined,
      });
    });

    it('handles zero as a valid value', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'log.level': 0 as any,
        message: 'test message',
      };

      const result = getLogFieldWithFallback(doc, ['log.level', 'message'] as const);

      expect(result).toEqual({
        field: 'log.level',
        value: '0',
      });
    });

    it('handles empty string as a valid value', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: '',
      };

      const result = getLogFieldWithFallback(doc, ['message'] as const);

      expect(result).toEqual({
        field: 'message',
        value: '',
      });
    });

    it('handles array values by converting to string', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'exception.type': ['Error', 'withMessage', 'withStack'] as any,
      };

      const result = getLogFieldWithFallback(doc, ['exception.type'] as const);

      expect(result).toEqual({
        field: 'exception.type',
        value: 'Error,withMessage,withStack',
      });
    });
  });

  describe('formattedValue', () => {
    it('returns formattedValue when includeFormattedValue is true and value is valid JSON', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: '{"key": "value", "nested": {"foo": "bar"}}',
      };

      const result = getLogFieldWithFallback(doc, ['message'] as const, {
        includeFormattedValue: true,
      });

      expect(result).toEqual({
        field: 'message',
        value: '{"key": "value", "nested": {"foo": "bar"}}',
        formattedValue: '{\n  "key": "value",\n  "nested": {\n    "foo": "bar"\n  }\n}',
      });
    });

    it('does not return formattedValue when includeFormattedValue is false', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: '{"key": "value"}',
      };

      const result = getLogFieldWithFallback(doc, ['message'] as const, {
        includeFormattedValue: false,
      });

      expect(result.field).toBe('message');
      expect(result.value).toBe('{"key": "value"}');
      expect(result.formattedValue).toBeUndefined();
    });

    it('does not return formattedValue when value is not valid JSON', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: 'not a json string',
      };

      const result = getLogFieldWithFallback(doc, ['message'] as const, {
        includeFormattedValue: true,
      });

      expect(result.field).toBe('message');
      expect(result.value).toBe('not a json string');
      expect(result.formattedValue).toBeUndefined();
      expect(result.originalValue).toBeUndefined();
    });
  });

  describe('originalValue', () => {
    it('returns originalValue when includeOriginalValue is true', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'exception.type': ['Error', 'withMessage', 'withStack'] as any,
      };

      const result = getLogFieldWithFallback(doc, ['exception.type'] as const, {
        includeOriginalValue: true,
      });

      expect(result.field).toBe('exception.type');
      expect(result.value).toBe('Error,withMessage,withStack');
      expect(result.originalValue).toEqual(['Error', 'withMessage', 'withStack']);
    });

    it('returns undefined originalValue when includeOriginalValue is false', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'exception.type': ['Error', 'withMessage', 'withStack'] as any,
      };

      const result = getLogFieldWithFallback(doc, ['exception.type'] as const, {
        includeOriginalValue: false,
      });

      expect(result.field).toBe('exception.type');
      expect(result.value).toBe('Error,withMessage,withStack');
      expect(result.originalValue).toBeUndefined();
    });

    it('always returns value as string even when originalValue is an array', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        'exception.type': ['Error', 'withMessage'] as any,
      };

      const result = getLogFieldWithFallback(doc, ['exception.type'] as const, {
        includeOriginalValue: true,
      });

      expect(result.field).toBe('exception.type');
      expect(typeof result.value).toBe('string');
      expect(Array.isArray(result.originalValue)).toBe(true);
    });

    it('returns undefined originalValue by default when not specified', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        message: 'test message',
      };

      const result = getLogFieldWithFallback(doc, ['message'] as const);

      expect(result.field).toBe('message');
      expect(result.value).toBe('test message');
      expect(result.originalValue).toBeUndefined();
    });
  });
});
