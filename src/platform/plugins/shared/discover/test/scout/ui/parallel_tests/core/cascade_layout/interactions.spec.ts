/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Covers the ES|QL grouped ("cascade") layout's end-to-end UI interactions:
 * the layout renders with a group count, a row's context menu opens,
 * fullscreen works, and opting out of / back into grouping (plus switching
 * to classic mode) doesn't error.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';
import { runCascadeQuery } from '../../../fixtures/common/helpers';

const STATS_QUERY =
  'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';

spaceTest.describe(
  'Discover cascade layout - row actions, fullscreen, and mode switches',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'renders grouped results, supports row actions and fullscreen, and switches modes without errors',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await spaceTest.step(
          'an ES|QL grouping query shows the cascade layout with a group count',
          async () => {
            expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
            await expect(page.testSubj.locator('discoverQueryTotalHits')).toContainText('groups');
          }
        );

        const firstRowId = await spaceTest.step('a row context menu opens and closes', async () => {
          const [rowId] = await discover.getCascadeLayoutVisibleRowIds();

          await page.testSubj.locator(`${rowId}-dscCascadeRowContextActionButton`).click();
          await expect(page.testSubj.locator('dscCascadeRowContextActionMenu')).toBeVisible();

          await page.keyboard.press('Escape');
          await expect(page.testSubj.locator('dscCascadeRowContextActionMenu')).toBeHidden();

          return rowId;
        });

        await spaceTest.step('expanding a row and entering/exiting fullscreen works', async () => {
          await discover.toggleCascadeLayoutRow(firstRowId);

          await page.testSubj.click('dataGridFullScreenButton');
          await expect(page.locator('.euiDataGrid--fullScreen')).toBeVisible();

          await page.testSubj.click('dataGridFullScreenButton');
          await expect(page.locator('.euiDataGrid--fullScreen')).toBeHidden();
        });

        await spaceTest.step(
          'opting out of grouping shows the flat layout with no errors',
          async () => {
            await page.testSubj.click('discoverEnableCascadeLayoutSwitch');
            await expect(page.testSubj.locator('discoverGroupBySelectionList')).toBeVisible();

            await page.testSubj.click('discoverCascadeLayoutOptOutButton');
            await discover.waitUntilTabIsLoaded();

            expect(await discover.isShowingCascadeLayout()).toBe(false);
            await expect(discover.getErrorCalloutMessage()).toBeHidden();
          }
        );

        await spaceTest.step(
          're-selecting the group field and switching to classic mode works with no errors',
          async () => {
            await page.testSubj.click('discoverEnableCascadeLayoutSwitch');
            await expect(page.testSubj.locator('discoverGroupBySelectionList')).toBeVisible();

            await page.testSubj.click('clientip-cascadeLayoutOptionBtn');
            await discover.waitUntilTabIsLoaded();
            expect(await discover.isShowingCascadeLayout()).toBe(true);

            await discover.selectClassicMode();
            await expect(discover.getErrorCalloutMessage()).toBeHidden();
          }
        );
      }
    );
  }
);
