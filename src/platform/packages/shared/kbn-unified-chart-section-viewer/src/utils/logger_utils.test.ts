/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toLoggable } from './logger_utils';

describe('toLoggable', () => {
  it('returns the same Error instance when given an Error', () => {
    const error = new Error('boom');
    expect(toLoggable(error)).toBe(error);
  });

  it('returns the string form for a number', () => {
    expect(toLoggable(42)).toBe('42');
  });

  it('returns the string form for a boolean', () => {
    expect(toLoggable(false)).toBe('false');
  });

  it('returns the string form for null', () => {
    expect(toLoggable(null)).toBe('null');
  });

  it('returns the string form for undefined', () => {
    expect(toLoggable(undefined)).toBe('undefined');
  });

  it('returns String() for a plain object', () => {
    expect(toLoggable({ foo: 'bar' })).toBe('[object Object]');
  });
});
