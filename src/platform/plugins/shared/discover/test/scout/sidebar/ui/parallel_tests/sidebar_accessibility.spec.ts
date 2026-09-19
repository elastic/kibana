/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the Discover sidebar: the field-type filter popover,
 * the collapsed state, and the field editor opened from "Add a field".
 *
 * Runs as a privileged user: "Add a field" is gated on `canEditDataView`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const SIDEBAR_TEST_SUBJ = '[data-test-subj="discover-sidebar"]';

/** Scanned as a second root: `EuiPopover` portals the panel out of the sidebar. */
const FIELD_TYPE_FILTER_PANEL_TEST_SUBJ = '[data-test-subj="fieldListFiltersFieldTypeFilterPanel"]';

/** Scan root for the collapsed state, where the sidebar itself is unmounted. */
const PAGE_TEST_SUBJ = '[data-test-subj="dscPage"]';

spaceTest.describe('Discover sidebar - accessibility', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // Overlays animate in; axe can otherwise scan a half-rendered frame.
    await discoverScoutSpace.uiSettings.set({ 'accessibility:disableAnimations': true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('accessibility:disableAnimations');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'has no automated a11y violations with the field type filter open',
    async ({ page, pageObjects }) => {
      const { unifiedFieldList } = pageObjects;

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.openFieldTypeFilter();

      const { violations } = await page.checkA11y({
        include: [SIDEBAR_TEST_SUBJ, FIELD_TYPE_FILTER_PANEL_TEST_SUBJ],
      });
      expect(violations).toStrictEqual([]);
    }
  );

  spaceTest(
    'has no automated a11y violations when the sidebar is collapsed',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.closeSidebar();

      const { violations } = await page.checkA11y({ include: [PAGE_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);
    }
  );

  spaceTest(
    'has no automated a11y violations in the field editor opened from the sidebar',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.openAddFieldEditorFromSidebar();

      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="fieldEditor"]'],
      });
      expect(violations).toStrictEqual([]);
    }
  );
});
