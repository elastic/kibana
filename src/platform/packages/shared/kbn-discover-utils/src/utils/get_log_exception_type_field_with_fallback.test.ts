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

  it(`returns ${OTEL_EXCEPTION_TYPE_FIELD} when present`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_EXCEPTION_TYPE_FIELD,
      value: 'ProgrammingError',
    });
  });

  it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is not present`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_EXCEPTION_TYPE_FIELD,
      value: 'UndefinedTable',
    });
  });

  it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is null`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_EXCEPTION_TYPE_FIELD]: null as any,
      [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_EXCEPTION_TYPE_FIELD,
      value: 'UndefinedTable',
    });
  });

  it(`falls back to ${ERROR_EXCEPTION_TYPE_FIELD} when ${OTEL_EXCEPTION_TYPE_FIELD} is undefined`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [ERROR_EXCEPTION_TYPE_FIELD]: 'ValueError',
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_EXCEPTION_TYPE_FIELD,
      value: 'ValueError',
    });
  });

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

  it(`prioritizes ${OTEL_EXCEPTION_TYPE_FIELD} even when ${ERROR_EXCEPTION_TYPE_FIELD} also exists`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
      [ERROR_EXCEPTION_TYPE_FIELD]: 'UndefinedTable',
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_EXCEPTION_TYPE_FIELD,
      value: 'ProgrammingError',
    });
    expect(result.value).not.toBe('UndefinedTable');
  });

  it(`handles array values for ${OTEL_EXCEPTION_TYPE_FIELD}`, () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_EXCEPTION_TYPE_FIELD]: ['ProgrammingError', 'UndefinedTable'] as any,
    };

    const result = getLogExceptionTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_EXCEPTION_TYPE_FIELD,
      value: ['ProgrammingError', 'UndefinedTable'],
    });
  });
});
