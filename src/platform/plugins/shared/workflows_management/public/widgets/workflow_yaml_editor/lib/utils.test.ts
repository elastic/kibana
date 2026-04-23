/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSeverityString, MarkerSeverity } from './utils';

describe('MarkerSeverity', () => {
  it('defines the expected severity values', () => {
    expect(MarkerSeverity.Hint).toBe(1);
    expect(MarkerSeverity.Info).toBe(2);
    expect(MarkerSeverity.Warning).toBe(4);
    expect(MarkerSeverity.Error).toBe(8);
  });
});

describe('getSeverityString', () => {
  it.each([
    [MarkerSeverity.Error, 'error'],
    [MarkerSeverity.Warning, 'warning'],
    [MarkerSeverity.Info, 'info'],
    [MarkerSeverity.Hint, 'info'],
  ] as const)('converts %d to "%s"', (severity, expected) => {
    expect(getSeverityString(severity)).toBe(expected);
  });

  it('returns "info" for unknown severity values', () => {
    expect(getSeverityString(99 as MarkerSeverity)).toBe('info');
  });
});
