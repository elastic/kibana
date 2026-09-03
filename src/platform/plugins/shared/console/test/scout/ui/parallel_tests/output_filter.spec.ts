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

// `._shards` returns the value object, so the `_shards` key itself disappears from the
// output while `successful` (unique to that object) stays.
const SHARDS_FILTER = '._shards';

spaceTest.describe('Console output filter', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.gotoWithRequestLoaded('GET /_search?pretty');
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.sendRequest();
    await expect(pageObjects.console.outputEditorContent).toContainText('hits');
  });

  spaceTest('expands and collapses the filter row', async ({ pageObjects }) => {
    await expect(pageObjects.console.outputFilterInput).toBeHidden();

    await pageObjects.console.toggleOutputFilterRow();
    await expect(pageObjects.console.outputFilterInput).toBeVisible();

    await pageObjects.console.toggleOutputFilterRow();
    await expect(pageObjects.console.outputFilterInput).toBeHidden();
  });

  spaceTest(
    'applies a filter to the output and restores it when cleared',
    async ({ pageObjects }) => {
      await pageObjects.console.toggleOutputFilterRow();

      await spaceTest.step('applying the filter narrows the output', async () => {
        await pageObjects.console.setOutputFilter(SHARDS_FILTER);
        await expect(pageObjects.console.outputEditorContent).toContainText('"successful"');
        await expect(pageObjects.console.outputEditorContent).not.toContainText('hits');
      });

      await spaceTest.step('clearing the filter restores the full output', async () => {
        await pageObjects.console.setOutputFilter('');
        await expect(pageObjects.console.outputEditorContent).toContainText('hits');
      });
    }
  );

  spaceTest(
    'marks the filter button while a filter is applied and the row is collapsed',
    async ({ pageObjects }) => {
      await pageObjects.console.toggleOutputFilterRow();
      await pageObjects.console.setOutputFilter(SHARDS_FILTER);
      await expect(pageObjects.console.outputEditorContent).not.toContainText('hits');

      await pageObjects.console.toggleOutputFilterRow();
      await expect(pageObjects.console.outputFilterInput).toBeHidden();

      await expect(pageObjects.console.outputFilterActiveIndicator).toBeVisible();
    }
  );
});
