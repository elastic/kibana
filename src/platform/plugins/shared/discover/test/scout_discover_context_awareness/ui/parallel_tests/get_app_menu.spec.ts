/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  CLASSIC_NAV_DEPLOYMENTS,
  CONTEXT_AWARENESS_DATA_VIEWS,
} from '../fixtures';

/**
 * `example-root-profile` contributes a submenu to the top nav for every data source, while
 * `example-data-source-profile` adds an extra action — and one nested under Alerts — only for
 * `my-example-logs`. `logstash*` resolves the root profile alone, so it sees the submenu but not
 * the data-source action.
 *
 * The top nav keeps secondary actions in an overflow popover regardless of window width, so the
 * popover is opened before asserting: with it open, inline and overflow items are rendered
 * together and a single set of visibility checks covers both placements.
 *
 * Classic navigation only: the submenu comes from `example-root-profile`, which bails out once a
 * solution view is active. The solution view side is covered by
 * get_app_menu_solution_view.spec.ts.
 */
spaceTest.describe(
  'Discover context awareness - extension getAppMenu',
  { tag: CLASSIC_NAV_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'renders the main actions and the action from the root profile',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery('from logstash* | sort @timestamp desc');

        await page.testSubj.click('app-menu-overflow-button');
        await expect(page.testSubj.locator('app-menu-popover')).toBeVisible();

        await expect(page.testSubj.locator('discoverNewButton')).toBeVisible();
        await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
        await expect(page.testSubj.locator('example-custom-root-submenu')).toBeVisible();
      }
    );

    spaceTest('renders the custom actions', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.goto({ queryMode: 'esql' });
      await discover.writeAndSubmitEsqlQuery(
        `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
      );

      await page.testSubj.click('app-menu-overflow-button');
      await expect(page.testSubj.locator('app-menu-popover')).toBeVisible();

      await expect(page.testSubj.locator('discoverNewButton')).toBeVisible();
      await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
      await expect(page.testSubj.locator('example-custom-root-submenu')).toBeVisible();
      await expect(page.testSubj.locator('example-custom-action')).toBeVisible();

      await discover.clickAppMenuItem('example-custom-root-submenu');
      await expect(page.testSubj.locator('example-custom-root-action12')).toBeVisible();

      await page.testSubj.click('example-custom-root-action12');
      await expect(page.testSubj.locator('example-custom-root-action12-flyout')).toBeVisible();

      await page.testSubj.click('euiFlyoutCloseButton');
      await expect(page.testSubj.locator('example-custom-root-action12-flyout')).toBeHidden();

      await discover.clickAppMenuItem('discoverAlertsButton');
      await expect(page.testSubj.locator('example-custom-action-under-alerts')).toBeVisible();
    });
  }
);
