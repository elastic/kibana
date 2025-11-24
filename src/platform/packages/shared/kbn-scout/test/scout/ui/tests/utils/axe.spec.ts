/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect } from '../../../../../src/playwright';

test.describe('runA11yScan', () => {
  test('returns violations array (empty for basic accessible markup)', async ({ page }) => {
    await page.setContent(`
      <main>
        <h1>Title</h1>
        <button aria-label="Close dialog">X</button>
        <form>
          <label for="email">Email</label>
          <input id="email" type="email" />
        </form>
      </main>
    `);

    const { violations } = await page.checkA11y();

    expect(Array.isArray(violations)).toBe(true);

    // Basic page should have no serious/critical violations
    expect(violations).toHaveLength(0);
  });
});
