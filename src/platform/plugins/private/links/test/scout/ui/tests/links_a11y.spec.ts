/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TARGET_DASHBOARD_TITLE = 'Links a11y target';
const EMPTY_PANEL_TITLE = 'Empty links';
const LINKS_PANEL_TITLE = 'Some links';

test.describe('Links panel - accessibility', { tag: ['@local-stateful-classic'] }, () => {
  let emptyLinksDashboardId: string;
  let linksDashboardId: string;

  test.beforeAll(async ({ apiServices }) => {
    const targetDashboardId = await apiServices.dashboard.create({
      title: TARGET_DASHBOARD_TITLE,
      panels: [],
    });
    emptyLinksDashboardId = await apiServices.dashboard.create({
      title: 'Links a11y empty',
      panels: [
        {
          type: 'links',
          grid: { x: 0, y: 0, w: 24, h: 6 },
          config: { title: EMPTY_PANEL_TITLE, links: [], layout: 'horizontal' },
        },
      ],
    });
    linksDashboardId = await apiServices.dashboard.create({
      title: 'Links a11y',
      panels: [
        {
          type: 'links',
          grid: { x: 0, y: 0, w: 24, h: 6 },
          config: {
            title: LINKS_PANEL_TITLE,
            layout: 'horizontal',
            links: [
              { type: 'dashboardLink', label: 'Dashboard link', destination: targetDashboardId },
              { type: 'externalLink', label: 'External link', destination: 'https://elastic.co' },
            ],
          },
        },
      ],
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('links panel has no accessibility violations', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(linksDashboardId);
    await expect(pageObjects.linksPanel.linksComponent).toBeVisible();

    const { violations } = await page.checkA11y();
    expect(violations).toStrictEqual([]);
  });

  test('empty links editor flyout has no accessibility violations', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard, linksPanel } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(emptyLinksDashboardId);
    await linksPanel.openPanelEditor(EMPTY_PANEL_TITLE);

    const { violations } = await page.checkA11y();
    expect(violations).toStrictEqual([]);
  });

  test('non-empty links editor flyout has no accessibility violations', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard, linksPanel } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(linksDashboardId);
    await linksPanel.openPanelEditor(LINKS_PANEL_TITLE);
    await expect(linksPanel.getEditorLinks()).toHaveCount(2);

    const { violations } = await page.checkA11y();
    expect(violations).toStrictEqual([]);
  });

  test('add dashboard link flyout has no accessibility violations', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard, linksPanel } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(emptyLinksDashboardId);
    await linksPanel.openPanelEditor(EMPTY_PANEL_TITLE);
    await linksPanel.openLinkEditor();

    const { violations } = await page.checkA11y();
    expect(violations).toStrictEqual([]);
  });

  test('add external link flyout has no accessibility violations', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard, linksPanel } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(emptyLinksDashboardId);
    await linksPanel.openPanelEditor(EMPTY_PANEL_TITLE);
    await linksPanel.setExternalUrl('https://elastic.co');

    const { violations } = await page.checkA11y();
    expect(violations).toStrictEqual([]);
  });
});
