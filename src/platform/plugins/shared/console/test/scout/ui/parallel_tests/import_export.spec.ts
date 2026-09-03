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

const REQUEST = 'GET _search';

spaceTest.describe('Console file import and export', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('imports a file into the editor', async ({ pageObjects }) => {
    await pageObjects.console.importFile('console_import', REQUEST);

    await expect.poll(() => pageObjects.console.getEditorText()).toBe(REQUEST);
  });

  spaceTest('exports the editor content as a file', async ({ page, pageObjects }) => {
    await pageObjects.console.enterText(REQUEST);

    const download = page.waitForEvent('download');
    await pageObjects.console.exportButton.click();
    const exportedFile = await download;

    const stream = await exportedFile.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString('utf8')).toBe(REQUEST);
  });
});
