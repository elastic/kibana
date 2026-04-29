/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogEventTypeFieldWithFallback } from './get_log_event_type_field_with_fallback';
import { OTEL_EVENT_NAME_FIELD, PROCESSOR_EVENT_FIELD } from '../field_constants';
import type { LogDocumentOverview } from '../types';

describe('getLogEventTypeFieldWithFallback', () => {
  const createBaseDoc = (): LogDocumentOverview => ({
    '@timestamp': '2024-01-15T10:30:00Z',
    'data_stream.namespace': 'default',
    'data_stream.dataset': 'logs',
  });

  it('returns OTEL event_name when present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      event_name: 'exception',
      'processor.event': 'error',
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_EVENT_NAME_FIELD,
      value: 'exception',
    });
  });

  it('falls back to processor.event when OTEL event_name is not present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'processor.event': 'error',
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: PROCESSOR_EVENT_FIELD,
      value: 'error',
    });
  });

  it('falls back to processor.event when OTEL event_name is null', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      event_name: null as any,
      'processor.event': 'error',
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: PROCESSOR_EVENT_FIELD,
      value: 'error',
    });
  });

  it('falls back to processor.event when OTEL event_name is undefined', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'processor.event': 'transaction',
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: PROCESSOR_EVENT_FIELD,
      value: 'transaction',
    });
  });

  it('returns undefined field when neither OTEL event_name nor processor.event are present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: undefined,
    });
  });

  it('returns undefined field when both fields are null', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      event_name: null as any,
      'processor.event': null as any,
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: undefined,
    });
  });

  it('prioritizes OTEL event_name even when processor.event also exists', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      event_name: 'exception',
      'processor.event': 'error',
    };

    const result = getLogEventTypeFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_EVENT_NAME_FIELD,
      value: 'exception',
    });
    expect(result.value).not.toBe('error');
  });
});
