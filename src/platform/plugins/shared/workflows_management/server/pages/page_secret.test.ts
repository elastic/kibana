/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';

const ref = { workflowId: 'workflow-1', spaceId: 'default', pageId: 'default' };

describe('page secret', () => {
  it('makes a 43-character base64url secret', () => {
    const secret = generatePageSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generatePageSecret()).not.toBe(secret);
  });

  it('accepts the secret that made the hash', () => {
    const secret = generatePageSecret();
    expect(isPageSecretValid(ref, secret, computePageSecretHash(ref, secret))).toBe(true);
  });

  it('rejects another secret', () => {
    const hash = computePageSecretHash(ref, generatePageSecret());
    expect(isPageSecretValid(ref, generatePageSecret(), hash)).toBe(false);
  });

  it.each([
    ['workflow', { ...ref, workflowId: 'workflow-2' }],
    ['space', { ...ref, spaceId: 'other' }],
    ['page', { ...ref, pageId: 'other' }],
  ])('rejects the hash of another %s', (_, otherRef) => {
    const secret = generatePageSecret();
    expect(isPageSecretValid(otherRef, secret, computePageSecretHash(ref, secret))).toBe(false);
  });

  it('rejects a malformed stored hash', () => {
    expect(isPageSecretValid(ref, generatePageSecret(), 'not-hex')).toBe(false);
  });
});
