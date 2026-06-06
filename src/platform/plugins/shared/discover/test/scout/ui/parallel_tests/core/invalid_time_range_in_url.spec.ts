/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover landing with an invalid `to:null` in the URL should fall back to
 * the default "last 15 minutes" timerange. Migrated from the "invalid time
 * range in URL" describe in
 * `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const ALLOWED_START_LABELS = ['~ 15 minutes ago', 'now-15m', 'now-15m/m'];

spaceTest.describe('Discover - invalid time range in URL', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    // The FTR test does NOT set `timepicker:timeDefaults` — it relies on
    // Discover's hard-coded fallback to "now-15m".
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('falls back to the default time range', async ({ page, pageObjects }) => {
    // Land on Discover the normal way first so the `defaultIndex` UI
    // setting is actually applied and a valid data view is selected
    // (otherwise Discover can pick an unrelated auto-created data view
    // like "Beats Monitoring" when the URL state is incomplete).
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();

    // Re-navigate to the same URL but with `_g.time.to = null`. Keep
    // `_a` (the resolved data view) on the URL so we don't lose it on
    // reload, and use a full `page.goto` so Discover re-runs its
    // boot-time URL-state cleanup which is what surfaces the time
    // fallback. (A hash-only mutation does not re-run that path.)
    const baselineUrl = page.url();
    const url = new URL(baselineUrl);
    const hash = url.hash.replace(/^#/, '');
    const [hashPath, hashQuery = ''] = hash.split('?');
    const params = new URLSearchParams(hashQuery);
    params.set('_g', '(time:(from:now-15m,to:null))');
    url.hash = `#${hashPath}?${params.toString()}`;
    await page.goto(url.toString());
    await pageObjects.discover.waitUntilSearchingHasFinished();

    const time = await pageObjects.datePicker.getTimeConfig();
    expect(ALLOWED_START_LABELS).toContain(time.start);
    expect(time.end).toBe('now');
  });
});
