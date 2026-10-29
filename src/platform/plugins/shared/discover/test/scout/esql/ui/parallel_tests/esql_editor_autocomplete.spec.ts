/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Suggestion content is covered by Jest in kbn-esql-language (autocomplete.test.ts and
 * inline_suggest.test.ts). This covers the Monaco widget wiring, which needs a real browser.
 *
 * Migrated from `src/platform/test/examples/esql_ux_example/esql_editor_autocomplete.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const SOURCE_QUERY = 'FROM logstash-* ';

spaceTest.describe('Discover ES|QL editor autocomplete', { tag: '@local-stateful-classic' }, () => {
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

  spaceTest('drives the suggestion widget from the keyboard', async ({ page, pageObjects }) => {
    const { esqlEditor } = pageObjects;
    const suggestWidget = esqlEditor.getSuggestWidget();

    const resetEditor = async () => {
      await page.keyboard.press('Escape');
      await esqlEditor.setQuery('');
    };

    await spaceTest.step('opens on its own after typing a space', async () => {
      await esqlEditor.typeQuery('FROM ');
      await expect(suggestWidget).toBeVisible();
    });

    await spaceTest.step('opens on its own after a pipe and a space', async () => {
      await resetEditor();
      await esqlEditor.typeQuery(`${SOURCE_QUERY}| `);
      await expect(suggestWidget).toBeVisible();
    });

    await spaceTest.step('does not insert snippet placeholders on selection', async () => {
      await resetEditor();
      await esqlEditor.typeQuery(`${SOURCE_QUERY}| WHERE bytes `);
      await expect(suggestWidget).toBeVisible();

      await page.keyboard.press('Enter');

      expect(await esqlEditor.getQuery()).not.toContain('$0');
    });

    await spaceTest.step('accepts the inline suggestion with TAB', async () => {
      await resetEditor();
      await esqlEditor.typeQuery('FROM logstash-');
      await page.keyboard.press('*');
      await expect(esqlEditor.getInlineSuggestion()).toBeVisible();

      await page.keyboard.press('Tab');

      await expect.poll(() => esqlEditor.getQuery()).toBe('FROM logstash-* | WHERE KQL("term")');
    });

    await spaceTest.step('inserts a date picked from the time picker', async () => {
      await resetEditor();
      await esqlEditor.selectSuggestion(`${SOURCE_QUERY}| WHERE @timestamp > `, 'time picker');

      // The 15th is never one of the adjacent-month days padding the grid, so it is unique.
      await page.testSubj
        .locator('ESQLEditor-timepicker-popover')
        .getByRole('option', { name: /\b15(?:st|nd|rd|th)?\b/ })
        .click();

      expect(await esqlEditor.getQuery()).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    await spaceTest.step('closes on Escape and reopens when refocusing the editor', async () => {
      await resetEditor();
      await esqlEditor.typeQuery(`${SOURCE_QUERY}| `);
      await expect(suggestWidget).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(suggestWidget).toBeHidden();

      // Escape closes the widget but leaves Monaco focused, and clicking an already-focused
      // editor doesn't fire the focus handler that reopens suggestions, so blur it first.
      await esqlEditor.blur();
      await esqlEditor.focus();
      await expect(suggestWidget).toBeVisible();
    });
  });
});
