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
import { DASHBOARD_IDS, DASHBOARD_KBN_ARCHIVE } from '../constants';

test.describe('Links panel - add from library', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(DASHBOARD_KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('adds links panel to top of dashboard', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(DASHBOARD_IDS.LINKS_003);
    await pageObjects.dashboard.addEmbeddable('a few horizontal links', 'links');

    const [topPanelTitle] = await pageObjects.dashboard.getPanelTitles();
    expect(topPanelTitle).toBe('a few horizontal links');
  });
});
