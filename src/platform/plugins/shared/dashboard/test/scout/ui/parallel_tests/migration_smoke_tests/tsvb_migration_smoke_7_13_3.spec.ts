/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { spaceTest, expect, tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';
import {
  getDashboardPanels,
  getSavedObjectIdByTitle,
  importSavedObjects,
  openDashboard,
  setDefaultIndexByTitle,
} from './utils';

const EXPORT_PATH =
  'src/platform/plugins/shared/dashboard/test/scout/ui/parallel_tests/migration_smoke_tests/exports/tsvb_dashboard_migration_test_7_13_3.json';
const DASHBOARD_TITLE = 'TSVB 7.13.3';
const DATA_VIEW_TITLE = 'logstash*';

let dashboardId = '';

const getIndexPatternFromExport = () => {
  const absolutePath = path.resolve(process.cwd(), EXPORT_PATH);
  const entries = fs
    .readFileSync(absolutePath, 'utf8')
    .trim()
    .split(/\r?\n\r?\n/)
    .map((line) => JSON.parse(line));
  const indexPattern = entries.find((entry) => entry.type === 'index-pattern');
  if (!indexPattern) {
    throw new Error(`Index pattern not found in ${EXPORT_PATH}`);
  }
  return indexPattern as { id: string; attributes: Record<string, unknown> };
};

const ensureIndexPattern = async (kbnClient: KbnClient, spaceId: string) => {
  const indexPattern = getIndexPatternFromExport();
  try {
    await kbnClient.request({
      method: 'GET',
      path: `/s/${spaceId}/api/saved_objects/index-pattern/${indexPattern.id}`,
    });
  } catch {
    await kbnClient.request({
      method: 'POST',
      path: `/s/${spaceId}/api/saved_objects/index-pattern/${indexPattern.id}`,
      body: { attributes: indexPattern.attributes },
    });
  }
};

spaceTest.describe('TSVB migration smoke (7.13.3)', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await importSavedObjects(kbnClient, scoutSpace.id, EXPORT_PATH);
    await ensureIndexPattern(kbnClient, scoutSpace.id);
    dashboardId = await getSavedObjectIdByTitle(
      kbnClient,
      scoutSpace.id,
      'dashboard',
      DASHBOARD_TITLE
    );
    await setDefaultIndexByTitle(kbnClient, scoutSpace.id, DATA_VIEW_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('imports and renders TSVB panels without regressions', async ({ page, pageObjects, kbnClient, scoutSpace }) => {
    await spaceTest.step('open the migrated dashboard', async () => {
      await openDashboard(page, dashboardId);
      await pageObjects.dashboard.waitForRenderComplete();
      const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
      await expect(page.testSubj.locator('embeddablePanel')).toHaveCount(panels.length);
    });

    await spaceTest.step('verify panels render without errors', async () => {
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
    });

    await spaceTest.step('verify panel actions', async () => {
      await pageObjects.dashboard.switchToEditMode();
      const panelTitles = await pageObjects.dashboard.getPanelTitles();
      for (const title of panelTitles) {
        if (title) {
          await pageObjects.dashboard.expectExistsPanelAction('embeddablePanelAction-editPanel', title);
        } else {
          await pageObjects.dashboard.expectExistsPanelAction('embeddablePanelAction-editPanel');
        }
      }
    });
  });
});

