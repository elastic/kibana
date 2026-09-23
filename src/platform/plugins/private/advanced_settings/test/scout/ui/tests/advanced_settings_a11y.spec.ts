/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Accessibility of the Advanced Settings page as it first renders.
//
// The deeper interactions on this page (search, category filter, editing and
// saving a field) are still audited by the FTR suite at
// x-pack/platform/test/accessibility/apps/group1/advanced_settings.ts; this spec
// should absorb them when that file is migrated.
//
// FTR source: src/platform/test/accessibility/apps/management.ts
//             -> describe('data views') -> it('Advanced settings')

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// This suite only scans the in-app content; it never opens a modal, flyout, or
// context menu, so the app wrapper is the whole surface.
const A11Y_SELECTORS = ['.kbnAppWrapper'];

test.describe('Advanced settings - accessibility', { tag: tags.stateful.classic }, () => {
  test('settings page has no a11y violations', async ({
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();

    const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
    expect(violations).toStrictEqual([]);
  });
});
