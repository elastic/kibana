/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// `state:storeInSessionStorage` moves global app state out of the URL and into
// session storage, leaving a short hash in `_g` instead of the expanded state.
//
// This is one journey rather than four tests because the last step only means
// something in sequence: it asserts the toggle reaches an app that was loaded
// while the old value was in effect. That step must navigate through the Kibana
// chrome — a `page.goto` would reload the app and prove nothing.
//
// FTR source: src/platform/test/functional/apps/management/group4/_kibana_settings.ts
//             -> describe('state:storeInSessionStorage')

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SETTING = 'state:storeInSessionStorage';

// A data view must exist before the dashboard editor will render (otherwise the
// app shows the "no data" prompt and `openNewDashboard` never finds its toolbar).
const DATA_VIEW_TITLE = 'logstash-*';

// Kibana stamps hashed state with this literal prefix (kibana_utils
// state_hash.ts HASH_PREFIX), so `_g=h@…` is an exact hashed/unhashed signal.
const HASH_PREFIX = 'h@';

// The `_g` global state value in the URL, decoded, or '' when absent. Read via
// `expect.poll`: global state is rewritten asynchronously, so a snapshot right
// after a navigation may still hold the previous app's value.
const globalState = (page: ScoutPage): string =>
  decodeURIComponent(page.url().match(/_g=([^&]*)/)?.[1] ?? '');

// Expanded (unhashed) global state always carries at least a time range and a
// refresh interval, so it is a long rison object rather than a short `h@` hash.
const isExpanded = (page: ScoutPage): boolean => {
  const value = globalState(page);
  return value.length > 0 && !value.startsWith(HASH_PREFIX);
};

const isHashed = (page: ScoutPage): boolean => globalState(page).startsWith(HASH_PREFIX);

test.describe(
  'Advanced settings - state:storeInSessionStorage',
  { tag: tags.stateful.classic },
  () => {
    let dataViewId: string;

    test.beforeAll(async ({ apiServices }) => {
      const { data } = await apiServices.dataViews.create({
        title: DATA_VIEW_TITLE,
        override: true,
      });
      dataViewId = data.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ kbnClient }) => {
      await kbnClient.uiSettings.unset(SETTING);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.dataViews.delete(dataViewId);
    });

    test('hashes global state in the URL once enabled', async ({ kbnUrl, page, pageObjects }) => {
      const gotoSettings = async () => {
        await page.goto(kbnUrl.get('/app/management/kibana/settings'));
        await pageObjects.settings.waitForPageLoad();
      };

      await test.step('the setting is off by default', async () => {
        await gotoSettings();

        expect(await pageObjects.settings.getAdvancedSettingCheckboxValue(SETTING)).toBe(false);
      });

      await test.step('global state is expanded in the dashboard URL', async () => {
        await pageObjects.dashboard.openNewDashboard();

        await expect.poll(() => isExpanded(page)).toBe(true);
      });

      await test.step('enabling the setting sticks', async () => {
        await gotoSettings();
        await pageObjects.settings.toggleAdvancedSettingCheckbox(SETTING);

        expect(await pageObjects.settings.getAdvancedSettingCheckboxValue(SETTING)).toBe(true);
      });

      await test.step('global state is hashed in the dashboard URL', async () => {
        await pageObjects.dashboard.openNewDashboard();

        await expect.poll(() => isHashed(page)).toBe(true);
      });

      await test.step('turning it back off applies without a full page reload', async () => {
        await gotoSettings();
        await pageObjects.settings.toggleAdvancedSettingCheckbox(SETTING);

        // Navigating through the chrome keeps the browser on the same document,
        // so the dashboard app has to pick up the new value on its own. Kibana
        // restores the last dashboard URL rather than the listing, so assert on
        // the app rather than on a specific dashboards screen.
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await expect.poll(() => page.url()).toContain('/app/dashboards');

        await expect.poll(() => isExpanded(page)).toBe(true);
      });
    });
  }
);
