/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { KibanaRole } from '@kbn/scout';

const sampleDataRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['kibana_sample*'],
        privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
      },
    ],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['default'],
    },
  ],
};

// Tagged @local-stateful-classic (not cloud) until loginWithCustomRole is supported on Cloud runs
test.describe('Sample data install/uninstall', { tag: '@local-stateful-classic' }, () => {
  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('flights');
  });

  test('installs and uninstalls sample data via UI', async ({ browserAuth, page, kbnUrl }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginWithCustomRole(sampleDataRole);

    await test.step('navigate to sample data page', async () => {
      await page.goto(kbnUrl.get('/app/home#/tutorial_directory/sampleData'));
      await expect(page.testSubj.locator('sampleDataSetCardflights')).toBeVisible();
    });

    await test.step('install via UI button', async () => {
      await page.testSubj.locator('addSampleDataSetflights').click();
      await expect(page.testSubj.locator('removeSampleDataSetflights')).toBeVisible();
    });

    await test.step('uninstall via UI button', async () => {
      await page.testSubj.locator('removeSampleDataSetflights').click();
      await expect(page.testSubj.locator('addSampleDataSetflights')).toBeVisible();
    });

    await test.step('reinstall via UI button', async () => {
      await page.testSubj.locator('addSampleDataSetflights').click();
      await expect(page.testSubj.locator('removeSampleDataSetflights')).toBeVisible();
    });
  });
});
