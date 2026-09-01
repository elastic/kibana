/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Accessibility of the Stack Management landing page. The per-section screens
// are audited by the owning plugins' own Scout suites.
//
// FTR sources (both audited the same landing page):
//   src/platform/test/accessibility/apps/management.ts -> it('main view')
//   x-pack/platform/test/accessibility/apps/group1/management.ts -> it('main view')

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// This suite only scans the in-app content; it never opens a modal, flyout, or
// context menu, so the app wrapper is the whole surface.
const A11Y_SELECTORS = ['.kbnAppWrapper'];

test.describe('Stack Management - accessibility', { tag: tags.stateful.classic }, () => {
  test('landing page has no a11y violations', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.management.goto();

    const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
    expect(violations).toStrictEqual([]);
  });
});
