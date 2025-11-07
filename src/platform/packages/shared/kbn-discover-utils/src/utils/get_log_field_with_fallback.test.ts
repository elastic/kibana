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

  it('returns the first truthy value even if later values exist', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': 'info',
      message: 'test message',
      'error.message': 'error message',
    };

    const result = getLogFieldWithFallback(doc, ['log.level', 'message', 'error.message'] as const);

    expect(result).toEqual({
      field: 'log.level',
      value: 'info',
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
      value: 0,
    });
  });
});
