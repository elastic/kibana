/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../scout/common/ui/fixtures';

/**
 * `example-root-profile` contributes an ad hoc data view, which Discover falls back to when a space
 * has no data views of its own. That fallback must not reach further than it should: with no data
 * in the cluster at all, the onboarding page still has to win, or a user with an empty deployment
 * would be dropped into a data view that can only ever return nothing.
 *
 * This suite runs in its own server lane precisely so the cluster stays empty; see the
 * `discover_context_awareness_no_data` config set.
 */
test.describe('Discover context awareness - no data', { tag: ['@local-stateful-classic'] }, () => {
  test('shows the no data page even though a profile contributes a data view', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await page.gotoApp('discover');

    await expect(page.testSubj.locator('kbnNoDataPage')).toBeVisible();
  });
});
