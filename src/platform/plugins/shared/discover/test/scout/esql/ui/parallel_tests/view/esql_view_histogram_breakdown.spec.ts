/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL histogram breakdown field: choosing a breakdown from the toolbar or
 * from field stats renders the same legend, filtering by a legend value
 * appends a `WHERE` clause, and the breakdown selection persists in the
 * saved search.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../fixtures';

const EXTENSION_LEGEND = ['css', 'gif', 'jpg', 'php', 'png'];

spaceTest.describe(
  'Discover ES|QL view - histogram breakdown',
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
      await pageObjects.discover.codeEditor.setCodeEditorValue('from logstash-*');
      await pageObjects.discover.submitQuery();
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'choosing a breakdown field from the toolbar renders and filters the legend',
      async ({ pageObjects }) => {
        const { discover } = pageObjects;

        await discover.chooseBreakdownField('extension');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHistogramLegendList()).toStrictEqual(EXTENSION_LEGEND);

        await discover.clickLegendFilter('png', '+');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.codeEditor.getCodeEditorValue()).toBe(
          'from logstash-*\n| WHERE `extension` == "png"'
        );
      }
    );

    spaceTest('persists the breakdown field in a saved search', async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await discover.chooseBreakdownField('extension');
      await discover.waitUntilTabIsLoaded();
      await discover.saveSearch('esql view with breakdown');
      await discover.waitUntilTabIsLoaded();

      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHistogramLegendList()).toStrictEqual([]);

      await discover.loadSavedSearch('esql view with breakdown');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHistogramLegendList()).toStrictEqual(EXTENSION_LEGEND);
    });

    spaceTest(
      'choosing a breakdown field from field stats renders the same legend',
      async ({ pageObjects }) => {
        const { discover } = pageObjects;

        await discover.addBreakdownFieldFromSidebar('extension');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHistogramLegendList()).toStrictEqual(EXTENSION_LEGEND);
      }
    );
  }
);
