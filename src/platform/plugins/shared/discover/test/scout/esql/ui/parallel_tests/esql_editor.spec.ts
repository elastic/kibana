/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe('Discover ES|QL editor', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'shows an error callout for a malformed query and clears it',
    async ({ page, pageObjects }) => {
      const { discover, esqlEditor } = pageObjects;

      // Submitted directly rather than via writeAndSubmitEsqlQuery: that waits for a
      // successful fetch, which never arrives for a query the parser rejects.
      await esqlEditor.setQuery('from logstash-* | limit A');
      await discover.submitQuery();
      await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();

      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10');
      await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeHidden();
    }
  );

  spaceTest(
    'returns focus to the editor when the data source browser is dismissed',
    async ({ page, pageObjects }) => {
      const { esqlEditor } = pageObjects;

      await esqlEditor.setQuery('from logstash-*');

      // The sources badge is a Monaco decoration. Decorations are styled by class name
      // and cannot carry a data-test-subj, so this app-owned class is the stable hook.
      await esqlEditor.getDecoration('esqlSourcesBadge').click();
      await expect(page.testSubj.locator('esqlDataSourceBrowser')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.testSubj.locator('esqlDataSourceBrowser')).toBeHidden();

      // Focus must land back on the editor rather than being stranded on the body.
      await expect(esqlEditor.input).toBeFocused();
    }
  );

  spaceTest('prettifies the query when clicking the format button', async ({ pageObjects }) => {
    const { esqlEditor } = pageObjects;

    await esqlEditor.setQuery(
      'FROM logstash-* | WHERE bytes > 200 | STATS count = COUNT(*) BY geo.dest'
    );
    await esqlEditor.formatQuery();

    await expect.poll(() => esqlEditor.getQuery()).toContain('\n');
  });

  spaceTest(
    'submits the query with the Ctrl+Enter keyboard shortcut',
    async ({ page, pageObjects }) => {
      const { discover, dataGrid, esqlEditor } = pageObjects;

      // The default ES|QL query differs per deployment, so start from a known one.
      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 100');
      await expect(dataGrid.getColumnHeader('@timestamp')).toBeVisible();

      // Typed into the editor but never submitted through the button: only the real
      // keypress reaching the Monaco action can re-run the query.
      await esqlEditor.setQuery('from logstash-* | limit 100 | drop @timestamp');
      await esqlEditor.focus();
      await page.keyboard.press('Control+Enter');
      await discover.waitUntilSearchingHasFinished();

      await expect(dataGrid.getColumnHeader('@timestamp')).toBeHidden();
    }
  );

  spaceTest('shows and updates validation errors in the footer', async ({ pageObjects }) => {
    const { esqlEditor } = pageObjects;

    await spaceTest.step('lists the error details when clicking the footer button', async () => {
      await esqlEditor.setQuery('FROM logstash-* | WHERE wrong_field');
      await expect(esqlEditor.footerErrorButton).toBeVisible();

      await esqlEditor.footerErrorButton.click();
      await expect(esqlEditor.footerErrorContent).toContainText('wrong_field');
    });

    await spaceTest.step('clears the error for a valid query', async () => {
      await esqlEditor.setQuery('FROM logstash-* | WHERE bytes > 100 | STATS count = COUNT(*)');
      await expect(esqlEditor.footerErrorButton).toBeHidden();
    });

    await spaceTest.step('flags a missing operand and clears it once fixed', async () => {
      await esqlEditor.setQuery('FROM logstash-* | WHERE bytes >');
      await expect(esqlEditor.footerErrorButton).toBeVisible();

      await esqlEditor.setQuery('FROM logstash-* | WHERE bytes > 200');
      await expect(esqlEditor.footerErrorButton).toBeHidden();
    });

    await spaceTest.step('flags a mistyped command and clears it once fixed', async () => {
      await esqlEditor.setQuery('FROM logstash-* | WHERE bytes > 200 | SORTT bytes DESC');
      await expect(esqlEditor.footerErrorButton).toBeVisible();

      await esqlEditor.setQuery('FROM logstash-* | WHERE bytes > 200 | SORT bytes DESC');
      await expect(esqlEditor.footerErrorButton).toBeHidden();
    });
  });
});
