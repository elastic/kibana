/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL resource (data source) browser: closing the picker via Escape
 * returns keyboard focus to the editor.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../fixtures';

spaceTest.describe(
  'Discover ES|QL view - resource browser',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

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
      'returns focus to the editor when the data source picker is closed via Escape',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.codeEditor.setCodeEditorValue('from logstash-*');

        // `.esqlSourcesBadge` is a Monaco editor decoration (an inline widget
        // rendered by the editor itself), not a normal React DOM node, so it
        // has no `data-test-subj` to target.
        const badge = page.locator('.esqlSourcesBadge');
        await expect(badge).toBeVisible();
        await badge.click();
        await expect(page.testSubj.locator('esqlDataSourceBrowser')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.testSubj.locator('esqlDataSourceBrowser')).toBeHidden();

        await expect(page.testSubj.locator('ESQLEditor').locator('textarea')).toBeFocused();
      }
    );
  }
);
