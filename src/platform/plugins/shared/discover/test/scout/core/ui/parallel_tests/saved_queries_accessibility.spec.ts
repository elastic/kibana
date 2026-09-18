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
 * menu, open the save form, fill it, then delete the saved query and scan the
 * resulting empty list.
 *
 * The steps share a single popover, so they run as `test.step`s inside one test
 * rather than as separate tests.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

const MENU_PANEL_TEST_SUBJ = '[data-test-subj="queryBarMenuPanel"]';
const SAVE_FORM_TEST_SUBJ = '[data-test-subj="saveQueryForm"]';

/**
 * Excluded from the post-deletion scan. Once the last saved query is removed the
 * list is replaced by the selectable's `emptyMessage`, which leaves the search
 * input with invalid ARIA attribute values (`aria-valid-attr-value`). Carried
 * over from the FTR suite, which scoped out the same subject for the same
 * reason; it can be dropped once the underlying control is fixed.
 */
const SEARCH_INPUT_TEST_SUBJ = '[data-test-subj="saved-query-management-search-input"]';

const SAVED_QUERY_NAME = 'a11yQuery';

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
      async ({ page, pageObjects }) => {
        const { discover, savedQueryManagementMenu } = pageObjects;

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
          await savedQueryManagementMenu.fillSaveQueryForm(SAVED_QUERY_NAME, {
            includeFilters: false,
          });

          const { violations } = await page.checkA11y({ include: [SAVE_FORM_TEST_SUBJ] });
          expect(violations).toStrictEqual([]);

          await savedQueryManagementMenu.confirmSaveQueryForm();
        });

        await spaceTest.step('list after deleting the query', async () => {
          // Deletion happens with the load submenu open, so the list re-renders
          // in place as the empty state — the view this scan targets.
          await savedQueryManagementMenu.deleteSavedQuery(SAVED_QUERY_NAME);

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
