/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fixture file for audit.test.ts: exercises destructuring consumption,
// including a second key (lens) alongside the first (dashboard). Not a real
// Scout spec (audit.test.ts reads this as text, never executes it), but it
// lives under test/scout* so Scout's own ESLint rules apply.
describe('fixture suite', () => {
  test('uses dashboard and lens via destructuring', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await expect(dashboard.goto()).resolves.toBeUndefined();
    await expect(lens.goto()).resolves.toBeUndefined();
  });
});
