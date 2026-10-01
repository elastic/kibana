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
  CONTEXT_AWARENESS_DATA_VIEWS,
  SOLUTION_VIEW_DEPLOYMENTS,
} from '../fixtures';

/**
 * The solution view counterpart of get_app_menu.spec.ts. `example-solution-view-root-profile`
 * contributes no app menu items, so the submenu the root profile adds under classic navigation is
 * absent here — including the action `example-data-source-profile` registers *into* that submenu,
 * which has nowhere to attach.
 *
 * What the data source profile adds on its own — the top level action and the one under Alerts —
 * is unaffected, so those still have to be there.
 */
spaceTest.describe(
  'Discover context awareness - extension getAppMenu under a solution view',
  { tag: SOLUTION_VIEW_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'renders the main actions but not the action from the root profile',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery('from logstash* | sort @timestamp desc');

        await page.testSubj.click('app-menu-overflow-button');
        await expect(page.testSubj.locator('app-menu-popover')).toBeVisible();

        await expect(page.testSubj.locator('discoverNewButton')).toBeVisible();
        await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
        await expect(page.testSubj.locator('example-custom-root-submenu')).toBeHidden();
      }
    );

    spaceTest('renders the custom actions', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.writeAndSubmitEsqlQuery(
        `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
      );

      await page.testSubj.click('app-menu-overflow-button');
      await expect(page.testSubj.locator('app-menu-popover')).toBeVisible();

      await expect(page.testSubj.locator('discoverNewButton')).toBeVisible();
      await expect(page.testSubj.locator('discoverAlertsButton')).toBeVisible();
      await expect(page.testSubj.locator('example-custom-action')).toBeVisible();
      await expect(page.testSubj.locator('example-custom-root-submenu')).toBeHidden();

      await discover.clickAppMenuItem('discoverAlertsButton');
      await expect(page.testSubj.locator('example-custom-action-under-alerts')).toBeVisible();
    });
  }
);
