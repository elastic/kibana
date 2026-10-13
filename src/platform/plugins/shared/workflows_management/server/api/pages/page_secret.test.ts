/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computePageSecretHash, generatePageSecret, isPageSecretValid } from './page_secret';

const ref = { workflowId: 'report-incident', spaceId: 'default' };

describe('page secret', () => {
  it('generates a new URL-safe secret every time', () => {
    const first = generatePageSecret();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generatePageSecret()).not.toBe(first);
  });

  it('accepts the secret the hash was made from', () => {
    const secret = generatePageSecret();
    const secretHash = computePageSecretHash({ ...ref, secret });
    expect(isPageSecretValid({ ...ref, secret, secretHash })).toBe(true);
  });

  it('rejects another secret, workflow, or space', () => {
    const secret = generatePageSecret();
    const secretHash = computePageSecretHash({ ...ref, secret });
    expect(isPageSecretValid({ ...ref, secret: generatePageSecret(), secretHash })).toBe(false);
    expect(isPageSecretValid({ ...ref, workflowId: 'other', secret, secretHash })).toBe(false);
    expect(isPageSecretValid({ ...ref, spaceId: 'other', secret, secretHash })).toBe(false);
  });

  it('rejects a malformed stored hash', () => {
    expect(isPageSecretValid({ ...ref, secret: 'x', secretHash: 'abc' })).toBe(false);
  });
});
