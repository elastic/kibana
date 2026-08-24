/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fields table behaviour inside the Discover doc-viewer flyout, in ES|QL mode:
 * type filters over the wider ES|QL field set, and the
 * show-only-selected-fields switch. These run against `KEEP`-projected results,
 * so the data-view counterparts in `doc_viewer_fields_table.spec.ts` and
 * `doc_viewer_fields_table_selection.spec.ts` are kept as well — only those see
 * the full document payload and its meta-field ordering.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`filter by field type` and `show only selected fields in ES|QL mode` groups).
 *
 * Dropped (covered at the unit layer):
 * - `hide null values switch - ES|QL mode` (table.test.tsx)
 * - `should disable the switch when no fields are selected` (table.test.tsx)
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover doc viewer - fields table (ES|QL)',
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

    spaceTest('filters fields by type', async ({ pageObjects }) => {
      const { discover, dataGrid, docViewer } = pageObjects;

      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10000');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      const initialCount = await docViewer.getFieldNameCount();
      // ES|QL surfaces many fields; at least the 7 numeric ones must be present.
      expect(initialCount).toBeGreaterThan(7);

      // Pin one field so we can confirm pinned fields survive type filtering.
      await docViewer.togglePinAction('agent');

      await docViewer.openFieldTypeFilter();
      await expect(docViewer.getFieldTypeFilterOptions()).toHaveCount(6);

      // 7 number fields + 1 pinned field = 8.
      await docViewer.clickFieldTypeFilterOption('number');
      await expect(docViewer.getFieldNames()).toHaveCount(8);
    });

    spaceTest('toggles the show-only-selected-fields switch', async ({ pageObjects }) => {
      const { discover, dataGrid, unifiedFieldList, docViewer } = pageObjects;

      await discover.writeAndSubmitEsqlQuery('from logstash-* | sort @timestamp | limit 10');
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      // Add two columns so the switch becomes enabled.
      await unifiedFieldList.clickFieldListItemAdd('agent.raw');
      await unifiedFieldList.clickFieldListItemAdd('agent');

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      const fieldNames = docViewer.getFieldNames();
      const getFieldNameTexts = () => fieldNames.allTextContents();

      // All fields are listed; the selected ones appear in alphabetical order.
      await expect
        .poll(async () => {
          const texts = await getFieldNameTexts();
          return texts.slice(0, 6).join(',');
        })
        .toBe('@message,@message.raw,@tags,@tags.raw,@timestamp,agent');

      // Show only the two selected columns plus @timestamp (always included).
      await docViewer.clickShowOnlySelectedFieldsSwitch();
      await expect.poll(getFieldNameTexts).toStrictEqual(['@timestamp', 'agent.raw', 'agent']);

      // Pinning a field moves it to the top of the list.
      await docViewer.togglePinAction('agent');
      await expect.poll(getFieldNameTexts).toStrictEqual(['agent', '@timestamp', 'agent.raw']);

      // Switching back shows all fields, with the pinned field first.
      await docViewer.clickShowOnlySelectedFieldsSwitch();
      await expect
        .poll(async () => {
          const texts = await getFieldNameTexts();
          return texts[0];
        })
        .toBe('agent');
    });
  }
);
