/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOURCES_TYPES } from '@kbn/esql-types';
import { getSourceTypeKey, getSourceTypeLabel, VIEW_TYPE_KEY } from './utils';

describe('getSourceTypeLabel', () => {
  it('returns External data for External type', () => {
    expect(getSourceTypeLabel('External')).toBe('External data');
  });

  it('returns External data for lowercase external', () => {
    expect(getSourceTypeLabel('external')).toBe('External data');
  });

  it('returns Index as the fallback', () => {
    expect(getSourceTypeLabel()).toBe('Index');
    expect(getSourceTypeLabel(undefined)).toBe('Index');
  });

  it('returns correct labels for other known types', () => {
    expect(getSourceTypeLabel('Index')).toBe('Index');
    expect(getSourceTypeLabel('Integration')).toBe('Integration');
    expect(getSourceTypeLabel('Timeseries')).toBe('Timeseries');
    expect(getSourceTypeLabel('Data Stream')).toBe('Stream');
    expect(getSourceTypeLabel('Alias')).toBe('Alias');
    expect(getSourceTypeLabel('Lookup')).toBe('Lookup Index');
    expect(getSourceTypeLabel(SOURCES_TYPES.VIEW)).toBe('View');
    expect(getSourceTypeLabel('view')).toBe('View');
  });
});

describe('getSourceTypeKey', () => {
  it('returns external for External type', () => {
    expect(getSourceTypeKey('External')).toBe('external');
  });

  it('returns external for lowercase external', () => {
    expect(getSourceTypeKey('external')).toBe('external');
  });

  it('returns index as the fallback', () => {
    expect(getSourceTypeKey()).toBe('index');
    expect(getSourceTypeKey(undefined)).toBe('index');
  });

  it('returns correct keys for other known types', () => {
    expect(getSourceTypeKey('Index')).toBe('index');
    expect(getSourceTypeKey('Integration')).toBe('integration');
    expect(getSourceTypeKey('Timeseries')).toBe('timeseries');
    expect(getSourceTypeKey('Data Stream')).toBe('stream');
    expect(getSourceTypeKey('Alias')).toBe('alias');
    expect(getSourceTypeKey('Lookup')).toBe('lookup_index');
    expect(VIEW_TYPE_KEY).toBe('view');
    expect(getSourceTypeKey(SOURCES_TYPES.VIEW)).toBe('view');
    expect(getSourceTypeKey('view')).toBe('view');
  });
});
