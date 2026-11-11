/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPrincipalKey, getPrincipalKind, isPrincipalType, matchesPrincipal } from './principals';

describe('isPrincipalType', () => {
  it('accepts known kinds only', () => {
    expect(isPrincipalType('user')).toBe(true);
    expect(isPrincipalType('service_account')).toBe(true);
    expect(isPrincipalType('group')).toBe(false);
    expect(isPrincipalType('')).toBe(false);
  });
});

describe('getPrincipalKind', () => {
  it('returns the only known kind, ignoring unknown ones', () => {
    expect(getPrincipalKind(['user'])).toBe('user');
    expect(getPrincipalKind(['group', 'service_account'])).toBe('service_account');
    expect(getPrincipalKind(['user', 'user'])).toBe('user');
  });

  it('returns nothing for no known kind or for several', () => {
    expect(getPrincipalKind([])).toBeUndefined();
    expect(getPrincipalKind(['group'])).toBeUndefined();
    expect(getPrincipalKind(['user', 'service_account'])).toBeUndefined();
  });
});

describe('matchesPrincipal', () => {
  const user = { type: 'user' as const, id: 'u_1' };

  it('matches any stored ID of the same kind', () => {
    expect(matchesPrincipal({ type: ['user'], id: ['u_0', 'u_1'] }, user)).toBe(true);
  });

  it('never matches another kind, or a component without exactly one known kind', () => {
    expect(matchesPrincipal({ type: ['service_account'], id: ['u_1'] }, user)).toBe(false);
    expect(matchesPrincipal({ type: ['user', 'service_account'], id: ['u_1'] }, user)).toBe(false);
    expect(matchesPrincipal({ type: [], id: ['u_1'] }, user)).toBe(false);
  });
});

describe('getPrincipalKey', () => {
  it('tells kinds apart for the same ID text', () => {
    expect(getPrincipalKey({ type: 'user', id: 'u_1' })).not.toBe(
      getPrincipalKey({ type: 'service_account', id: 'u_1' })
    );
  });
});
