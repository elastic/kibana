/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Filtering the doc-viewer fields table in classic data-view mode: field search,
 * type filters, and the hide-null-values switch.
 *
 * Sibling specs cover the rest of the fields table:
 * - `doc_viewer_fields_table_esql.spec.ts` — the ES|QL counterparts
 * - `doc_viewer_fields_table_selection.spec.ts` — show-only-selected and pinning
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`search`, `filter by field type`, and `hide null values switch - data view
 * mode` groups).
 *
 * Dropped (covered at the unit layer):
 * - both `should disable the switch when no fields are selected` tests
 *   (table.test.tsx) — the switch's disabled state only; the enabled/toggling
 *   behaviour is covered in `doc_viewer_fields_table_selection.spec.ts`
 * - `should reveal and hide the filter form when the toggle is clicked`
 *   (field_type_filter.test.tsx) — a popover show/hide with no API call, so the
 *   browser round-trip adds nothing over the unit test
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Discover doc viewer - fields table', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.dataGrid.waitForLoad();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('filters fields by name or value', async ({ pageObjects }) => {
    const { docViewer } = pageObjects;

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

    await docViewer.findFieldByNameOrValue('geo');
    await expect(docViewer.getFieldNames()).toHaveCount(4);

    await docViewer.findFieldByNameOrValue('.sr');
    await expect(docViewer.getFieldNames()).toHaveCount(2);
  });

  spaceTest('filters fields by type', async ({ pageObjects }) => {
    const { docViewer } = pageObjects;

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
    const initialCount = await docViewer.getFieldNameCount();

    await docViewer.openFieldTypeFilter();

    await docViewer.clickFieldTypeFilterOption('date');
    await expect(docViewer.getFieldNames()).toHaveCount(4);

    await docViewer.clickFieldTypeFilterOption('number');
    await expect(docViewer.getFieldNames()).toHaveCount(8);

    await docViewer.clearAllFieldTypeFilters();
    await expect(docViewer.getFieldNames()).toHaveCount(initialCount);
  });

  spaceTest('hides fields with null values', async ({ pageObjects }) => {
    const { docViewer } = pageObjects;

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

    await docViewer.openFieldTypeFilter();
    await docViewer.clickFieldTypeFilterOption('keyword');
    await expect(docViewer.getFieldNames()).toHaveCount(8);
    await docViewer.closeFieldTypeFilter();

    await docViewer.toggleHideNullValues();
    await expect.poll(() => docViewer.getFieldNameCount()).toBeLessThan(8);

    // Toggling back restores the full set.
    await docViewer.toggleHideNullValues();
    await expect(docViewer.getFieldNames()).toHaveCount(8);
  });
});
