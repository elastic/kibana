/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { redactAttributes, toNamespace } from './saved_objects';

describe('redactAttributes', () => {
  it('redacts credential-like keys at any depth', () => {
    expect(
      redactAttributes({
        name: 'rule',
        apiKey: 'abc',
        params: { password: 'p', nested: [{ accessToken: 't', keep: 1 }] },
        secrets: { user: 'u' },
      })
    ).toEqual({
      name: 'rule',
      apiKey: '[redacted]',
      params: { password: '[redacted]', nested: [{ accessToken: '[redacted]', keep: 1 }] },
      secrets: '[redacted]',
    });
  });

  it('returns an empty object for non-object attributes', () => {
    expect(redactAttributes(null)).toEqual({});
    expect(redactAttributes([1])).toEqual({});
  });
});

describe('toNamespace', () => {
  it('maps the default space to the default namespace', () => {
    expect(toNamespace('default')).toBeUndefined();
    expect(toNamespace(undefined)).toBeUndefined();
    expect(toNamespace('space-a')).toBe('space-a');
  });
});
