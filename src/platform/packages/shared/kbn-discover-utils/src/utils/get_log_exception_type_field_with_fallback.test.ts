/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogExceptionTypeFieldWithFallback } from './get_log_exception_type_field_with_fallback';
import { OTEL_EXCEPTION_TYPE_FIELD, ERROR_EXCEPTION_TYPE_FIELD } from '../field_constants';
import type { LogDocumentOverview } from '../types';

describe('getLogExceptionTypeFieldWithFallback', () => {
  const createBaseDoc = (): LogDocumentOverview => ({
    '@timestamp': '2024-01-15T10:30:00Z',
    'data_stream.namespace': 'default',
    'data_stream.dataset': 'logs',
  });

  describe('field priority', () => {
    it(`returns ${OTEL_EXCEPTION_TYPE_FIELD} when present`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(OTEL_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('ProgrammingError');
      expect(result.originalValue).toBe('ProgrammingError');
    });

    it(`prioritizes ${OTEL_EXCEPTION_TYPE_FIELD} even when ${ERROR_EXCEPTION_TYPE_FIELD} also exists`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
        [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(OTEL_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('ProgrammingError');
      expect(result.originalValue).toBe('ProgrammingError');
      expect(result.value).not.toBe('UndefinedTable');
    });
  });

  describe('fallback behavior', () => {
    it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is not present`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(ERROR_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('UndefinedTable');
      expect(result.originalValue).toBe('UndefinedTable');
    });

    it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is null`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [OTEL_EXCEPTION_TYPE_FIELD]: null as any,
        [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(ERROR_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('UndefinedTable');
      expect(result.originalValue).toBe('UndefinedTable');
    });

    it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is undefined`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [ERROR_EXCEPTION_TYPE_FIELD]: 'ValueError',
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(ERROR_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('ValueError');
      expect(result.originalValue).toBe('ValueError');
    });
  });

  describe('missing fields', () => {
    it(`returns undefined field when neither ${OTEL_EXCEPTION_TYPE_FIELD} nor ${ERROR_EXCEPTION_TYPE_FIELD} are present`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result).toEqual({
        field: undefined,
      });
    });

    it('returns undefined field when both fields are null', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [OTEL_EXCEPTION_TYPE_FIELD]: null as any,
        [ERROR_EXCEPTION_TYPE_FIELD]: null as any,
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result).toEqual({
        field: undefined,
      });
    });
  });

  describe('array values', () => {
    it(`handles array values for ${OTEL_EXCEPTION_TYPE_FIELD}`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [OTEL_EXCEPTION_TYPE_FIELD]: ['ProgrammingError', 'UndefinedTable'] as any,
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(OTEL_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('ProgrammingError,UndefinedTable');
      expect(result.originalValue).toEqual(['ProgrammingError', 'UndefinedTable']);
    });

    it(`handles array values for ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is not present`, () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [ERROR_EXCEPTION_TYPE_FIELD]: ['Error', 'withMessage', 'withStack'] as any,
      };

      const result = getLogExceptionTypeFieldWithFallback(doc);

      expect(result.field).toBe(ERROR_EXCEPTION_TYPE_FIELD);
      expect(result.value).toBe('Error,withMessage,withStack');
      expect(result.originalValue).toEqual(['Error', 'withMessage', 'withStack']);
    });
  });
});
