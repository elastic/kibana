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

// lz-string payloads, as produced by the "Open in Console" links.
const HELLO_COMPRESSED = 'BYUwNmD2Q';
const TRUNCATED_COMPRESSED = 'BYUwNmD2';

spaceTest.describe('Console load_from deep links', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest(
    'appends the request carried in the data URI to the editor content',
    async ({ pageObjects }) => {
      await pageObjects.console.enterText('GET _search');
      // Only the persisted copy survives the navigation below.
      await pageObjects.console.waitForEditorContentPersisted('GET _search');

      await pageObjects.console.gotoWithRawLoadFrom(`data:text/plain,${HELLO_COMPRESSED}`);

      await expect
        .poll(() => pageObjects.console.getEditorText())
        .toBe(['GET _search', 'hello'].join('\n'));
    }
  );

  spaceTest(
    'shows an error toast when the data URI cannot be decoded',
    async ({ pageObjects, page }) => {
      await pageObjects.console.gotoWithRawLoadFrom(`data:text/plain,${TRUNCATED_COMPRESSED}`);

      await pageObjects.toasts.waitFor();
      await expect(page.components.toast().toasts).toHaveCount(1);
    }
  );
});
