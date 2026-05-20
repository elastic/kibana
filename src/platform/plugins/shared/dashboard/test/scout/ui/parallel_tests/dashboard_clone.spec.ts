/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

const SOURCE_DASHBOARD_TITLE = 'Dashboard Clone Test';

// Each panel marker is unique so the test can assert every original panel
// survived the clone, not just that the right count of panels exists.
const PANEL_MARKERS = ['clone marker alpha', 'clone marker beta', 'clone marker gamma'] as const;

const buildSourceDashboardAttributes = () => {
  const panels = PANEL_MARKERS.map((content, index) => {
    const panelIndex = uuidv4();
    return {
      type: 'markdown',
      panelIndex,
      gridData: { i: panelIndex, x: 0, y: index * 5, w: 24, h: 5 },
      embeddableConfig: {
        content,
        settings: { open_links_in_new_tab: true },
      },
    };
  });

  return {
    title: SOURCE_DASHBOARD_TITLE,
    description: '',
    panelsJSON: JSON.stringify(panels),
    optionsJSON: JSON.stringify({
      useMargins: true,
      syncColors: false,
      syncCursor: true,
      syncTooltips: false,
      hidePanelTitles: false,
    }),
    timeRestore: false,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({
        query: { query: '', language: 'kuery' },
        filter: [],
      }),
    },
  };
};

spaceTest.describe('Dashboard clone', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);

    // The cloning UX is what's under test; the source dashboard is pure setup,
    // so seed it via the saved-objects API instead of paying ~15s of UI flake
    // for openNewDashboard + 3x addMarkdownPanel + saveDashboard.
    await kbnClient.savedObjects.create({
      type: 'dashboard',
      space: scoutSpace.id,
      overwrite: true,
      attributes: buildSourceDashboardAttributes(),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'auto-increments titles, respects overrides, and preserves panels',
    async ({ pageObjects, page }) => {
      const cloneOf = (n: number) => `${SOURCE_DASHBOARD_TITLE} (${n})`;

      const expectCurrentDashboardTitle = async (expectedTitle: string) => {
        await expect(page.testSubj.locator('breadcrumb last')).toContainText(expectedTitle);
      };

      // After save-as-copy the dashboard app navigates to /view/<new-id>?_g=…
      const getCurrentDashboardId = (): string => {
        const url = page.url();
        const match = url.match(/#\/view\/([^?]+)/);
        expect(match, `Expected to be on a dashboard view, got URL: ${url}`).not.toBeNull();
        // expect() above guarantees match is non-null at runtime.
        return match![1];
      };

      const expectAllMarkersVisible = async () => {
        for (const marker of PANEL_MARKERS) {
          await expect(
            page.testSubj.locator('markdownRenderer').filter({ hasText: marker })
          ).toBeVisible();
        }
      };

      let clone1Id = '';

      await spaceTest.step('clone suggests "(1)"', async () => {
        await pageObjects.dashboard.loadSavedDashboard(SOURCE_DASHBOARD_TITLE);
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy();
        clone1Id = getCurrentDashboardId();
        await expectCurrentDashboardTitle(cloneOf(1));
      });

      await spaceTest.step('the clone contains every source panel', async () => {
        // Step 1's save-as-copy left us on clone (1) already; no nav needed.
        await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(PANEL_MARKERS.length);
        await expectAllMarkersVisible();
      });

      await spaceTest.step('cloning "(1)" suggests "(2)"', async () => {
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy();
        await expectCurrentDashboardTitle(cloneOf(2));
      });

      await spaceTest.step('cloning with a title override saves with that override', async () => {
        await pageObjects.dashboard.openDashboardWithId(clone1Id);
        await pageObjects.dashboard.ensureEditMode();
        await pageObjects.dashboard.saveDashboardAsCopy(cloneOf(20));
        await expectCurrentDashboardTitle(cloneOf(20));
      });

      await spaceTest.step(
        'subsequent clones increment from the highest existing index',
        async () => {
          await pageObjects.dashboard.openDashboardWithId(clone1Id);
          await pageObjects.dashboard.ensureEditMode();
          await pageObjects.dashboard.saveDashboardAsCopy();
          await expectCurrentDashboardTitle(cloneOf(21));
        }
      );
    }
  );
});
