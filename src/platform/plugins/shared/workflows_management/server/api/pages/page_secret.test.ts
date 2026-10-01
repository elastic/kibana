/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computePageSecret, PAGE_SECRET_LENGTH, verifyPageSecret } from './page_secret';

const KEY = 'k'.repeat(32);

describe('page secret', () => {
  it('is a fixed-length hex string', () => {
    const secret = computePageSecret(KEY, 'default', 'page-1');
    expect(secret).toMatch(/^[0-9a-f]+$/);
    expect(secret).toHaveLength(PAGE_SECRET_LENGTH);
  });

  it('is stable for the same key, space, and page', () => {
    expect(computePageSecret(KEY, 'default', 'page-1')).toBe(
      computePageSecret(KEY, 'default', 'page-1')
    );
  });

  it('verifies a secret it derived', () => {
    const secret = computePageSecret(KEY, 'default', 'page-1');
    expect(verifyPageSecret(KEY, 'default', 'page-1', secret)).toBe(true);
  });

  it('changes when the page-id changes, which is how rotation retires a URL', () => {
    const secret = computePageSecret(KEY, 'default', 'page-1');
    expect(verifyPageSecret(KEY, 'default', 'page-2', secret)).toBe(false);
  });

  it('rejects a secret from another space or signing key', () => {
    const secret = computePageSecret(KEY, 'default', 'page-1');
    expect(verifyPageSecret(KEY, 'other', 'page-1', secret)).toBe(false);
    expect(verifyPageSecret('x'.repeat(32), 'default', 'page-1', secret)).toBe(false);
  });

  it('rejects a secret of the wrong length without throwing', () => {
    expect(verifyPageSecret(KEY, 'default', 'page-1', 'short')).toBe(false);
  });
});
