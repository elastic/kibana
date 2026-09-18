/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the saved query menu, walked as one journey: open the
 * menu, save a query, then delete it and scan the resulting empty list. The
 * steps share a single popover, hence one test rather than four.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

const MENU_PANEL_TEST_SUBJ = '[data-test-subj="queryBarMenuPanel"]';
const SAVE_FORM_TEST_SUBJ = '[data-test-subj="saveQueryForm"]';

/**
 * Excluded from the post-deletion scan: the empty-state search input has
 * invalid `aria-valid-attr-value` attributes. Carried over from the FTR suite.
 */
const SEARCH_INPUT_TEST_SUBJ = '[data-test-subj="saved-query-management-search-input"]';

spaceTest.describe(
  'Discover saved queries - accessibility',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      // The menu and its panels animate in; axe can otherwise scan a
      // half-rendered frame and report transient violations.
      await discoverScoutSpace.uiSettings.set({ 'accessibility:disableAnimations': true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      // Privileged rather than viewer: the flow creates and deletes a saved query.
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.uiSettings.unset('accessibility:disableAnimations');
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'has no automated a11y violations across the saved query lifecycle',
      async ({ page, pageObjects }, testInfo) => {
        const { discover, savedQueryManagementMenu } = pageObjects;
        // Per-attempt name: cleanup only runs after retries, and the form
        // rejects a duplicate.
        const savedQueryName = `a11yQuery-${testInfo.retry}`;

        // "Save query" stays disabled until there is a query to save.
        await discover.writeAndSubmitKqlQuery('extension : "png"');
        await discover.waitUntilTabIsLoaded();

        await spaceTest.step('menu opened', async () => {
          await savedQueryManagementMenu.open();

          const { violations } = await page.checkA11y({ include: [MENU_PANEL_TEST_SUBJ] });
          expect(violations).toStrictEqual([]);
        });

        await spaceTest.step('save form opened', async () => {
          await savedQueryManagementMenu.openSaveQueryForm();

          const { violations } = await page.checkA11y({ include: [SAVE_FORM_TEST_SUBJ] });
          expect(violations).toStrictEqual([]);
        });

        await spaceTest.step('save form filled', async () => {
          await savedQueryManagementMenu.fillSaveQueryForm(savedQueryName, {
            includeFilters: false,
          });

          const { violations } = await page.checkA11y({ include: [SAVE_FORM_TEST_SUBJ] });
          expect(violations).toStrictEqual([]);

          await savedQueryManagementMenu.confirmSaveQueryForm();
        });

        await spaceTest.step('list after deleting the query', async () => {
          // Deletion leaves the load submenu open, re-rendered as the empty state.
          await savedQueryManagementMenu.deleteSavedQuery(savedQueryName);

          const { violations } = await page.checkA11y({
            include: [MENU_PANEL_TEST_SUBJ],
            exclude: [SEARCH_INPUT_TEST_SUBJ],
          });
          expect(violations).toStrictEqual([]);
        });
      }
    );
  }
);
