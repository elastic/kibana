/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover sidebar field stats in ES|QL',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        'from logstash-* METADATA _index, _id | sort @timestamp desc | limit 500'
      );
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('does not show field stats for ES|QL columns', async ({ pageObjects }) => {
      const { unifiedFieldList } = pageObjects;

      await unifiedFieldList.clickFieldListItem('bytes');
      await expect(unifiedFieldList.getFieldStatsFooter()).toBeHidden();
      await unifiedFieldList.closeFieldPopover();

      await unifiedFieldList.clickFieldListItem('extension');
      await expect(unifiedFieldList.getFieldStatsFooter()).toBeHidden();
      await unifiedFieldList.closeFieldPopover();
    });

    spaceTest('adds an is not null filter from the date field popover', async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await unifiedFieldList.clickFieldListExistsFilter('@timestamp');
      await discover.waitUntilSearchingHasFinished();

      const editorValue = await discover.getEsqlQueryValue();
      expect(editorValue).toContain('WHERE');
      expect(editorValue).toContain('@timestamp');
      expect(editorValue.toLowerCase()).toContain('is not null');
      await expect(unifiedFieldList.getFieldStatsFooter()).toBeHidden();
    });
  }
);
