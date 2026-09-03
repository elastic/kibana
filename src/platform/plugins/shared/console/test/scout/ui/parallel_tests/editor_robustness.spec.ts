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
import { LARGE_INPUT } from '../fixtures/large_input';
import { QUOTE_HEAVY_INPUT } from '../fixtures/quote_heavy_input';

const INVALID_REQUEST = 'GET _search\n{"query": {"match_all": {';

spaceTest.describe('Console editor robustness', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('keeps an invalid request intact when auto indenting it', async ({ pageObjects }) => {
    await pageObjects.console.enterText(INVALID_REQUEST);
    const versionBefore = await pageObjects.console.getModelVersionId();

    await pageObjects.console.pressShortcut('ControlOrMeta+i');

    // Auto indent bails out on an unparseable request with a no-op edit, so wait for the
    // model version to bump: unchanged content alone wouldn't prove the action ran.
    await expect.poll(() => pageObjects.console.getModelVersionId()).not.toBe(versionBefore);
    expect(await pageObjects.console.getEditorText()).toBe(INVALID_REQUEST);
  });

  spaceTest('rejects sending a request with an invalid body', async ({ pageObjects }) => {
    await pageObjects.console.enterText(INVALID_REQUEST);

    await pageObjects.console.clickPlay();

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe(
      'The selected request contains an error. Please resolve it and try again.'
    );
  });

  spaceTest('rejects sending a request with an unsupported method', async ({ pageObjects }) => {
    await pageObjects.console.enterText('OPTIONS /');

    await pageObjects.console.clickPlay();

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe(
      'The selected request contains errors. Please resolve them and try again.'
    );
  });

  spaceTest('opens a link written in the editor in a new tab', async ({ page, pageObjects }) => {
    await pageObjects.console.enterText('# https://www.elastic.co');
    await expect(pageObjects.console.detectedLinks).not.toHaveCount(0);

    const linkTab = page.context().waitForEvent('page');
    // Monaco's link opener also picks Ctrl vs Cmd from the user agent — see `pressShortcut`.
    await pageObjects.console.detectedLinks.click({ modifiers: ['Control'] });
    const linkPage = await linkTab;

    // Polled because a popup can still be at `about:blank` when the `page` event fires.
    await expect.poll(() => linkPage.url()).toContain('https://www.elastic.co');
    await linkPage.close();
  });

  spaceTest('still autocompletes after a large payload is loaded', async ({ pageObjects }) => {
    // Imported rather than typed: entering this much text key by key is prohibitively slow.
    await pageObjects.console.importFile('console_import_large_input', LARGE_INPUT);
    await expect.poll(() => pageObjects.console.getEditorText()).not.toBe('');

    await pageObjects.console.typeText('\nGET _search\n{\n"query": {\n');

    await expect(pageObjects.console.suggestWidget).toBeVisible();
  });

  spaceTest(
    'still autocompletes after a quote heavy payload is loaded',
    async ({ pageObjects }) => {
      // Guards the ES|QL context detection, which used to run in super-linear time on JSON
      // with many escaped quotes and froze the editor.
      await pageObjects.console.importFile('console_import_quote_heavy_input', QUOTE_HEAVY_INPUT);
      await expect.poll(() => pageObjects.console.getEditorText()).not.toBe('');

      await pageObjects.console.typeText('\nGET _search\n{\n"query": {\n');

      await expect(pageObjects.console.suggestWidget).toBeVisible();
    }
  );
});
