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

spaceTest.describe('Console variables', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.openConfigTab();
  });

  spaceTest.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('sense:variables'));
  });

  spaceTest('creates and removes a variable', async ({ pageObjects }) => {
    await pageObjects.console.addVariable({ name: 'index1', value: 'test' });
    await expect.poll(() => pageObjects.console.getVariableNames()).toContain('${index1}');

    await pageObjects.console.removeVariable('index1');
    // Console ships with two default variables (exampleVariable1/2), so the list
    // never becomes empty — only `index1` should be gone from it.
    await expect.poll(() => pageObjects.console.getVariableNames()).not.toContain('${index1}');
  });

  spaceTest('copies a variable to the clipboard', async ({ page, pageObjects }) => {
    await pageObjects.console.addVariable({ name: 'test_variable', value: 'test' });

    await pageObjects.console.variableCopyButton('test_variable').click();

    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('${test_variable}');
  });

  spaceTest('interpolates a variable used in the request url', async ({ pageObjects }) => {
    await pageObjects.console.addVariable({ name: 'index3', value: '_search' });
    await pageObjects.console.openShellTab();

    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET ${index3}');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  spaceTest('interpolates a variable used as a request body', async ({ pageObjects }) => {
    await pageObjects.console.addVariable({ name: 'query1', value: '{"match_all": {}}' });
    await pageObjects.console.openShellTab();

    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _search\n{\n"query": "${query1}"\n}');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  spaceTest('interpolates a variable inlined inside a request body', async ({ pageObjects }) => {
    await pageObjects.console.addVariable({ name: 'queryType', value: 'all' });
    await pageObjects.console.openShellTab();

    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _search\n{\n"query": {"match_${queryType}": {}}\n}');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });
});
