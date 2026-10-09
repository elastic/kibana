/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { DASHBOARD_KBN_ARCHIVE } from '../constants';

spaceTest.describe('Links panel - add from library', { tag: tags.deploymentAgnostic }, () => {
  let dashboardIds: Record<string, string>;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
    dashboardIds = Object.fromEntries(
      imported.filter(({ type }) => type === 'dashboard').map(({ title, id }) => [title, id])
    );
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('adds links panel to top of dashboard', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(dashboardIds['links 003']);
    await pageObjects.dashboard.addEmbeddable('a few horizontal links', 'links');

    const [topPanelTitle] = await pageObjects.dashboard.getPanelTitles();
    expect(topPanelTitle).toBe('a few horizontal links');
  });
});
