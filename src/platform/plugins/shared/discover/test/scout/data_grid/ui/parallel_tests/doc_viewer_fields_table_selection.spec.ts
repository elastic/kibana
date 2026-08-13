/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Which fields the doc-viewer fields table shows, and in what order, in classic
 * data-view mode: the show-only-selected-fields switch and field pinning.
 *
 * Both behaviours are ordering-sensitive against the *full* document payload —
 * meta fields (`_id`, `_ignored`, `_index`, `_score`) sort ahead of user fields,
 * and pinned fields sort ahead of everything. The ES|QL variants in
 * `doc_viewer_fields_table_esql.spec.ts` run against `KEEP`-projected results
 * and so never see the meta-field ordering, which is why both modes are kept.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`show only selected fields in data view mode > should allow toggling the
 * switch` and `pinning fields` groups).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

/** Meta fields the doc viewer lists before any user field, in this order. */
const LEADING_META_FIELDS = ['_id', '_ignored', '_index', '_score'];

spaceTest.describe(
  'Discover doc viewer - fields table selection and pinning',
  { tag: '@local-stateful-classic' },
  () => {
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

    spaceTest('toggles the show-only-selected-fields switch', async ({ page, pageObjects }) => {
      const { unifiedFieldList, docViewer } = pageObjects;

      // Two selected columns, so the switch is enabled and has something to show.
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('@tags');

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      const getFieldNameTexts = () => docViewer.getFieldNames().allTextContents();
      const getLeadingFields = async (count: number) => (await getFieldNameTexts()).slice(0, count);

      await expect(
        page.testSubj.locator('unifiedDocViewerShowOnlySelectedFieldsSwitch')
      ).toBeEnabled();

      // All fields: meta fields lead, then user fields alphabetically.
      await expect
        .poll(() => getLeadingFields(5))
        .toStrictEqual([...LEADING_META_FIELDS, '@message']);

      // Only selected: the two added columns plus @timestamp, which is always included.
      await docViewer.clickShowOnlySelectedFieldsSwitch();
      await expect.poll(getFieldNameTexts).toStrictEqual(['@timestamp', 'bytes', '@tags']);

      // Pinning moves a field to the top of the selected set.
      await docViewer.togglePinAction('bytes');
      await expect.poll(getFieldNameTexts).toStrictEqual(['bytes', '@timestamp', '@tags']);

      // Back to all fields: the pinned field still leads, meta fields follow.
      await docViewer.clickShowOnlySelectedFieldsSwitch();
      await expect
        .poll(() => getLeadingFields(6))
        .toStrictEqual(['bytes', ...LEADING_META_FIELDS, '@message']);
    });

    spaceTest('pins and unpins fields', async ({ pageObjects }) => {
      const { docViewer } = pageObjects;

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      const getFieldNameTexts = () => docViewer.getFieldNames().allTextContents();
      const getLeadingFields = async (count: number) => (await getFieldNameTexts()).slice(0, count);

      await expect
        .poll(() => getLeadingFields(5))
        .toStrictEqual([...LEADING_META_FIELDS, '@message']);
      await expect(docViewer.getPinnedFieldControl('agent')).not.toBeAttached();

      await docViewer.togglePinAction('agent');
      await expect.poll(() => getLeadingFields(3)).toStrictEqual(['agent', '_id', '_ignored']);
      await expect(docViewer.getPinnedFieldControl('agent')).toBeAttached();

      // Pins stack, most recently pinned first.
      await docViewer.togglePinAction('@message');
      await expect
        .poll(() => getLeadingFields(4))
        .toStrictEqual(['@message', 'agent', '_id', '_ignored']);
      await expect(docViewer.getPinnedFieldControl('@message')).toBeAttached();

      // Unpinning restores the natural order and leaves the other pin intact.
      await docViewer.togglePinAction('@message');
      await expect.poll(() => getLeadingFields(3)).toStrictEqual(['agent', '_id', '_ignored']);
      await expect(docViewer.getPinnedFieldControl('agent')).toBeAttached();
      await expect(docViewer.getPinnedFieldControl('@message')).not.toBeAttached();
    });
  }
);
