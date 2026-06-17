/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Dashboard image embeddable', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient, pageObjects }) => {
    await pageObjects.dashboard.openNewDashboard();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('creates a by-value map panel via the editor menu', async ({
    page,
    pageObjects: { dashboard },
  }) => {
    
  });
});