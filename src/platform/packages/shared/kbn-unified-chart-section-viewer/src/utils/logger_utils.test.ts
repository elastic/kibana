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
  it('returns Error instances as-is', () => {
    const error = new Error('boom');
    expect(toLoggable(error)).toBe(error);
  });

  it('converts numbers to string', () => {
    expect(toLoggable(42)).toBe('42');
  });

  it('converts booleans to string', () => {
    expect(toLoggable(false)).toBe('false');
  });

  it('converts null to string', () => {
    expect(toLoggable(null)).toBe('null');
  });

  it('converts undefined to string', () => {
    expect(toLoggable(undefined)).toBe('undefined');
  });

  it('serializes plain objects as JSON', () => {
    expect(toLoggable({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('serializes nested objects as JSON', () => {
    expect(toLoggable({ code: 401, body: { reason: 'unauthorized' } })).toBe(
      '{"code":401,"body":{"reason":"unauthorized"}}'
    );
  });

  it('falls back to String() for cyclic refs', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(toLoggable(cyclic)).toBe('[object Object]');
  });

  it('falls back to String() for BigInt (JSON.stringify throws TypeError)', () => {
    expect(toLoggable(BigInt(42))).toBe('42');
  });

  it('falls back to String() when toJSON throws', () => {
    const value = {
      toJSON() {
        throw new Error('toJSON failed');
      },
    };
    expect(toLoggable(value)).toBe('[object Object]');
  });
});
