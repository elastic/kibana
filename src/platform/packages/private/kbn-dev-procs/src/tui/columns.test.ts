/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fitText, getColumnWidths } from './columns';

describe('fitText', () => {
  it('pads short text to the width', () => {
    expect(fitText('map.emsUrl', 14, 'middle')).toBe('map.emsUrl    ');
  });

  it('keeps both ends of a long key, and the start of a long value', () => {
    const key = 'monitoring_collection.opentelemetry.metrics.otlp.exportIntervalMillis';
    expect(fitText(key, 21, 'middle')).toBe('monitoring…rvalMillis');
    expect(fitText(key, 21, 'middle')).toHaveLength(21);
    expect(fitText('/a/very/long/path', 8, 'end')).toBe('/a/very…');
  });

  it('handles tiny widths', () => {
    expect(fitText('abc', 0, 'end')).toBe('');
    expect(fitText('abc', 1, 'middle')).toBe('…');
  });
});

describe('getColumnWidths', () => {
  const rows = [
    { key: 'map.emsUrl' },
    { key: 'monitoring_collection.opentelemetry.metrics.otlp.exportIntervalMillis' },
    { key: 'server.port', value: '5611' },
  ];

  it('sizes the key column to the longest key that fits the pane', () => {
    expect(getColumnWidths(rows, 200)).toEqual({ key: 69, value: 4 });
    expect(getColumnWidths(rows, 100)).toEqual({ key: 55, value: 4 });
  });

  it('has no value column when no setting is set', () => {
    expect(getColumnWidths([{ key: 'map.emsUrl' }], 100).value).toBe(0);
  });
});
