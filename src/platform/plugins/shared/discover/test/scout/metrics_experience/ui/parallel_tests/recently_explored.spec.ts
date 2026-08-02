/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * "Recently explored" sort: interacting with a metric card records it, and the
 * recency sort surfaces interacted metrics first (most recent first). Only
 * panel-action clicks count as interactions: View details, Open in Discover
 * tab, Inspect, Copy to dashboard, and the actions toggle button.
 * Clicks elsewhere on the card are ignored. Gated behind
 * `discover.metricsExperienceSortEnabled`, enabled for the whole parallel
 * suite in `parallel_tests/global.setup.ts`.
 */

import { expect } from '@kbn/scout/ui';
import type { MetricsExperienceTestFixtures } from '../fixtures';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../fixtures';

const FIRST_CARD = 0;
const SECOND_CARD = 1;

type InteractionContext = Pick<MetricsExperienceTestFixtures, 'pageObjects' | 'page'>;

/**
 * Every panel action that must be recorded as an interaction. Each entry
 * performs the action and dismisses whatever UI it opened, leaving the grid
 * ready for the recency-sort assertion.
 */
const trackedInteractions: Array<{
  action: string;
  interact: (ctx: InteractionContext) => Promise<void>;
}> = [
  {
    action: 'View details',
    interact: async ({ pageObjects: { metricsExperience } }) => {
      await metricsExperience.openInsightsFlyout(SECOND_CARD);
      await metricsExperience.flyout.closeButton.click();
      await metricsExperience.flyout.container.waitFor({ state: 'hidden' });
    },
  },
  {
    action: 'Open in Discover tab',
    interact: async ({ pageObjects: { metricsExperience, unifiedTabs }, page }) => {
      const originalTabTestSubj = await unifiedTabs.getActiveTabTestSubj();

      // The action switches to a newly created in-app Discover tab; wait for
      // the switch to complete before navigating back to the metrics grid.
      await metricsExperience.clickExploreInDiscoverTab(SECOND_CARD);
      await expect(page.testSubj.locator(originalTabTestSubj)).toHaveAttribute(
        'aria-selected',
        'false'
      );

      await unifiedTabs.navigateToTabByTestSubj(originalTabTestSubj);
      await expect(metricsExperience.grid).toBeVisible();
    },
  },
  {
    action: 'Inspect',
    interact: async ({ pageObjects: { metricsExperience, inspector } }) => {
      await metricsExperience.openInspectorFlyout(SECOND_CARD);
      await inspector.panel.waitFor({ state: 'visible' });
      await inspector.close();
    },
  },
  {
    action: 'Copy to dashboard',
    interact: async ({ pageObjects: { metricsExperience }, page }) => {
      const saveModal = page.testSubj.locator('savedObjectSaveModal');
      await metricsExperience.clickCopyToDashboard(SECOND_CARD);
      await saveModal.waitFor({ state: 'visible' });
      await page.testSubj.click('saveCancelButton');
      await saveModal.waitFor({ state: 'hidden' });
    },
  },
  {
    action: 'Actions toggle button',
    interact: async ({ pageObjects: { metricsExperience }, page }) => {
      const contextMenuItems = page.testSubj.locator('presentationPanelContextMenuItems');
      await metricsExperience.openCardContextMenu(SECOND_CARD);
      await contextMenuItems.waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await contextMenuItems.waitFor({ state: 'hidden' });
    },
  },
];

spaceTest.describe(
  'Metrics in Discover - Recently explored',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const { discover, metricsExperience } = pageObjects;
      await browserAuth.loginAsViewer();
      await discover.goto({ queryMode: 'esql' });
      await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      await expect(metricsExperience.grid).toBeVisible();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    for (const { action, interact } of trackedInteractions) {
      spaceTest(
        `records "${action}" and moves the interacted metric to the front`,
        async ({ pageObjects, page }) => {
          const { metricsExperience } = pageObjects;

          const targetTitle = metricsExperience.getCardTitle(SECOND_CARD);
          await expect(targetTitle).not.toHaveText('');
          const targetMetricName = await targetTitle.textContent();

          await interact({ pageObjects, page });

          await metricsExperience.selectSortBy('recency');

          // The interacted metric moves to the front.
          await expect(metricsExperience.getCardTitle(FIRST_CARD)).toHaveText(
            String(targetMetricName)
          );
        }
      );
    }

    spaceTest('does not record clicks outside the panel actions', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;

      const firstTitle = metricsExperience.getCardTitle(FIRST_CARD);
      await expect(firstTitle).not.toHaveText('');
      const firstMetricName = await firstTitle.textContent();

      const targetTitle = metricsExperience.getCardTitle(SECOND_CARD);
      await expect(targetTitle).not.toHaveText('');
      const targetMetricName = await targetTitle.textContent();

      // Clicking the card outside the panel actions must not be recorded as an interaction.
      await targetTitle.click();

      await metricsExperience.selectSortBy('recency');

      // Nothing was recorded, so recency falls back to alphabetical order
      // and the clicked metric stays where it was.
      await expect(metricsExperience.getCardTitle(FIRST_CARD)).toHaveText(String(firstMetricName));
      await expect(metricsExperience.getCardTitle(SECOND_CARD)).toHaveText(
        String(targetMetricName)
      );
    });

    spaceTest('disables the direction toggle when sorting by recency', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;

      // Alphabetical sort (the default) lets the user pick a direction.
      await expect(metricsExperience.sortDirectionAsc).toBeEnabled();
      await expect(metricsExperience.sortDirectionDesc).toBeEnabled();

      // Recency is always most-recent-first, so the direction toggle is disabled.
      await metricsExperience.selectSortBy('recency');
      await expect(metricsExperience.sortDirectionAsc).toBeDisabled();
      await expect(metricsExperience.sortDirectionDesc).toBeDisabled();
    });
  }
);
