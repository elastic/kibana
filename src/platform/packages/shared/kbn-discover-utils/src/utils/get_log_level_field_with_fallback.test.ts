/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogLevelFieldWithFallback } from './get_log_level_field_with_fallback';
import {
  LOG_LEVEL_FIELD,
  ERROR_LOG_LEVEL_FIELD,
  OTEL_SEVERITY_TEXT_FIELD,
} from '../field_constants';
import type { LogDocumentOverview } from '../types';

describe('getLogLevelFieldWithFallback', () => {
  const createBaseDoc = (): LogDocumentOverview => ({
    '@timestamp': '2024-01-15T10:30:00Z',
    'data_stream.namespace': 'default',
    'data_stream.dataset': 'logs',
  });

  it('returns log.level when present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': 'info',
      'error.log.level': 'error',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: LOG_LEVEL_FIELD,
      value: 'info',
    });
  });

  it('falls back to error.log.level when log.level is not present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'error.log.level': 'error',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_LOG_LEVEL_FIELD,
      value: 'error',
    });
  });

  it('falls back to error.log.level when log.level is null', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': null as any,
      'error.log.level': 'critical',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_LOG_LEVEL_FIELD,
      value: 'critical',
    });
  });

  it('falls back to error.log.level when log.level is undefined', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'error.log.level': 'warning',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: ERROR_LOG_LEVEL_FIELD,
      value: 'warning',
    });
  });

  it('returns undefined field when both log.level and error.log.level are not present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: undefined,
    });
  });

  it('returns undefined field when both fields are null', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': null as any,
      'error.log.level': null as any,
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: undefined,
    });
  });

  it('prioritizes log.level even when error.log.level also exists', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': 'debug',
      'error.log.level': 'error',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: LOG_LEVEL_FIELD,
      value: 'debug',
    });
    expect(result.value).not.toBe('error');
  });

  it('returns severity_text when only the OTel field is present', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_SEVERITY_TEXT_FIELD]: 'ERROR',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_SEVERITY_TEXT_FIELD,
      value: 'ERROR',
    });
  });

  it('prioritizes log.level over severity_text', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': 'info',
      [OTEL_SEVERITY_TEXT_FIELD]: 'ERROR',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: LOG_LEVEL_FIELD,
      value: 'info',
    });
  });

  it('falls back to severity_text when log.level is null', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      'log.level': null as unknown as string,
      [OTEL_SEVERITY_TEXT_FIELD]: 'ERROR',
      'error.log.level': 'warning',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_SEVERITY_TEXT_FIELD,
      value: 'ERROR',
    });
  });

  it('prioritizes severity_text over error.log.level', () => {
    const doc: LogDocumentOverview = {
      ...createBaseDoc(),
      [OTEL_SEVERITY_TEXT_FIELD]: 'WARN',
      'error.log.level': 'error',
    };

    const result = getLogLevelFieldWithFallback(doc);

    expect(result).toEqual({
      field: OTEL_SEVERITY_TEXT_FIELD,
      value: 'WARN',
    });
  });
});
