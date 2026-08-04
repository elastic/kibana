/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover sidebar field groups in ES|QL',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'updates selected fields for transformational ES|QL and returns to data view mode',
      async ({ pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        const classicBaseline = await unifiedFieldList.getAvailableFieldCount();
        expect(classicBaseline).toBeGreaterThan(0);

        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10000');
        expect(await unifiedFieldList.getAvailableFieldCount()).toBeGreaterThan(classicBaseline);

        await discover.writeAndSubmitEsqlQuery(
          'from logstash-* | limit 10 | stats countB = count(bytes) by geo.dest | sort countB'
        );

        await unifiedFieldList.expectSidebarSectionFieldCount('selected', 2);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'countB',
          'geo.dest',
        ]);

        await discover.selectClassicMode();
        await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.expectAvailableFieldCount(classicBaseline);
      }
    );
  }
);
