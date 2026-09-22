/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ES_ARCHIVE, KBN_ARCHIVE } from '../constants';

test.describe('Kibana Overview - Solutions', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVE);
  });

  test('contains Security and Observability solutions', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');

    const solutionCards = page.testSubj.locator('kbnOverviewItem');
    await expect(solutionCards).not.toHaveCount(0);

    const observabilityCard = solutionCards.filter({ hasText: 'Observability' });
    await expect(observabilityCard).toHaveCount(1);

    const securityCard = solutionCards.filter({ hasText: 'Security' });
    await expect(securityCard).toHaveCount(1);
  });

  test('click on Observability card leads to Observability', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');

    const observabilityCard = page.testSubj
      .locator('kbnOverviewItem')
      .filter({ hasText: 'Observability' });
    await expect(observabilityCard).toBeVisible();
    await observabilityCard.click();
    await expect(page).toHaveURL(/app\/observability/);
  });

  test('click on Security card leads to Security', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('kibana_overview');

    const securityCard = page.testSubj.locator('kbnOverviewItem').filter({ hasText: 'Security' });
    await expect(securityCard).toBeVisible();
    await securityCard.click();
    await expect(page).toHaveURL(/app\/security/);
  });
});
