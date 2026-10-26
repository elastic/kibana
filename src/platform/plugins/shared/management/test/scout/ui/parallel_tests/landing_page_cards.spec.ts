/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe(
  'Stack Management — cards landing page',
  {
    tag: [
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('renders the cards landing page and opens Index Management from its card', async ({
      page,
      pageObjects,
    }) => {
      await test.step('renders the cards landing page', async () => {
        await pageObjects.management.gotoCardsLanding();
        await expect(pageObjects.management.cardsNavigationPage).toBeVisible();
      });

      await test.step('index management card opens Index Management', async () => {
        await pageObjects.management.appCard('index_management').click();
        await expect(page.getByTestId('indicesList')).toBeVisible();
      });
    });
  }
);
