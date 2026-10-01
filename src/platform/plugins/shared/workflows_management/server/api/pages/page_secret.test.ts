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
const BASE = { spaceId: 'default', workflowId: 'workflow-1', generation: 0 };

describe('page secret', () => {
  it('is a fixed-length hex string', () => {
    const secret = computePageSecret(KEY, BASE);
    expect(secret).toMatch(/^[0-9a-f]+$/);
    expect(secret).toHaveLength(PAGE_SECRET_LENGTH);
  });

  it('is stable for the same inputs, so the author can fetch the URL again', () => {
    expect(computePageSecret(KEY, BASE)).toBe(computePageSecret(KEY, BASE));
  });

  it('verifies a secret it derived', () => {
    expect(verifyPageSecret(KEY, BASE, computePageSecret(KEY, BASE))).toBe(true);
  });

  it('changes with the generation, which is how rotation retires a URL', () => {
    const secret = computePageSecret(KEY, BASE);
    expect(verifyPageSecret(KEY, { ...BASE, generation: 1 }, secret)).toBe(false);
  });

  it('rejects a secret from another space, workflow, or signing key', () => {
    const secret = computePageSecret(KEY, BASE);
    expect(verifyPageSecret(KEY, { ...BASE, spaceId: 'other' }, secret)).toBe(false);
    expect(verifyPageSecret(KEY, { ...BASE, workflowId: 'workflow-2' }, secret)).toBe(false);
    expect(verifyPageSecret('x'.repeat(32), BASE, secret)).toBe(false);
  });

  it('rejects a secret of the wrong length without throwing', () => {
    expect(verifyPageSecret(KEY, BASE, 'short')).toBe(false);
  });
});
