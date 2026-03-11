/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags, spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { setupFlyoutStability, teardownFlyoutStability } from '../../fixtures/flyout_stability';

spaceTest.describe('Flyout system Emotion cache stability', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await setupFlyoutStability(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await teardownFlyoutStability(scoutSpace);
  });

  spaceTest(
    'opening a flyout after a cascade close does not corrupt the Emotion style cache',
    async ({ page, pageObjects }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await spaceTest.step('open a document flyout', async () => {
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await expect(pageObjects.overlays.docViewerFlyout).toBeVisible();
      });

      await spaceTest.step('open a second flyout from a different domain', async () => {
        await pageObjects.overlays.openNewsfeedFlyout();
      });

      await spaceTest.step('close the second flyout, triggering a cascade close', async () => {
        await pageObjects.overlays.closeNewsfeedFlyout();
        await expect(pageObjects.overlays.docViewerFlyout).toBeHidden();
      });

      await spaceTest.step('open a new flyout after the cascade close', async () => {
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await expect(pageObjects.overlays.docViewerFlyout).toBeVisible();
      });

      await spaceTest.step(
        'verify no insertBefore errors from stale Emotion cache refs',
        async () => {
          await expect(page.testSubj.locator('discoverDocumentsTable')).toBeVisible();

          const hasInsertBeforeError = consoleErrors.some((msg) => msg.includes('insertBefore'));
          expect(hasInsertBeforeError).toBe(false);
        }
      );
    }
  );
});
