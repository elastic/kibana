/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Opening new Discover tabs in classic and ES|QL modes, per-tab state isolation,
 * and stability when many tabs are opened quickly.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

// The editor appends `*` to the title automatically, so the selected data view
// ends up as `logsta*` / `logst*`.
const CLASSIC_DATA_VIEW = 'logsta';
const ESQL_DATA_VIEW = 'logst';
const KQL_QUERY = 'machine.os: "macOS"';
const WIDE_TIME_RANGE = {
  from: 'Jan 10, 2000 @ 00:00:00.000',
  to: 'Dec 10, 2025 @ 00:00:00.000',
};

spaceTest.describe('Discover tabs - opening a new tab', { tag: tags.stateful.all }, () => {
  spaceTest.use({ viewport: { width: 1920, height: 1080 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    // Force a deterministic classic start so the suite stays correct even when
    // the default Discover query mode is ES|QL.
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'creates a new tab in classic mode with isolated per-tab state',
    async ({ pageObjects }) => {
      const { discover, filterBar, queryBar } = pageObjects;

      await spaceTest.step(
        'tab 1: new tab with an ad hoc data view, a filter and a KQL query',
        async () => {
          expect(await discover.getCurrentQueryMode()).toBe('classic');

          await discover.createNewTab();
          await discover.waitUntilTabIsLoaded();

          await discover.createDataViewFromSearchBar({
            name: CLASSIC_DATA_VIEW,
            hasTimeField: true,
          });

          await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpeg' });
          await discover.writeAndSubmitKqlQuery(KQL_QUERY);
        }
      );

      await spaceTest.step('tab 2: new ES|QL tab defaults to FROM logsta*', async () => {
        await discover.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe('FROM logsta*');
      });

      await spaceTest.step(
        'switching tabs restores each tab data view, query and filters',
        async () => {
          await discover.navigateToTabByIndex(0);
          expect(await discover.getSelectedDataViewName()).toBe('logstash-*');
          expect(await queryBar.getQuery()).toBe('');
          expect(await filterBar.getFilterCount()).toBe(0);

          await discover.navigateToTabByIndex(1);
          expect(await discover.getSelectedDataViewName()).toBe('logsta*');
          expect(await queryBar.getQuery()).toBe(KQL_QUERY);
          expect(await filterBar.getFilterCount()).toBe(1);
        }
      );

      await spaceTest.step(
        'a new tab inherits the active data view with an empty query and no filters',
        async () => {
          await discover.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getSelectedDataViewName()).toBe('logsta*');
          expect(await queryBar.getQuery()).toBe('');
          expect(await filterBar.getFilterCount()).toBe(0);
        }
      );
    }
  );

  spaceTest('creates a new tab in ES|QL mode', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;
    const defaultQuery = 'FROM logst*';
    const updatedQuery = 'FROM logst* | LIMIT 1050';

    await spaceTest.step('tab 0: create an ad hoc data view from the search bar', async () => {
      expect(await discover.getCurrentQueryMode()).toBe('classic');
      await discover.createDataViewFromSearchBar({ name: ESQL_DATA_VIEW, hasTimeField: true });
    });

    await spaceTest.step(
      'tab 1: new ES|QL tab defaults to FROM logst* and accepts an edited query',
      async () => {
        await discover.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(defaultQuery);

        await discover.codeEditor.setCodeEditorValue(updatedQuery);
        await page.testSubj.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(updatedQuery);
      }
    );

    await spaceTest.step('tab 2: another new tab resets to the default FROM logst*', async () => {
      await discover.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getEsqlQueryValue()).toBe(defaultQuery);
    });
  });

  spaceTest('completes all tabs that are opened quickly', async ({ pageObjects }) => {
    const { discover, datePicker } = pageObjects;

    await spaceTest.step(
      'set up an ES|QL query over all indices and a wide time range',
      async () => {
        await discover.writeAndSubmitEsqlQuery('FROM *');
        await discover.waitUntilTabIsLoaded();
        await datePicker.setAbsoluteRange(WIDE_TIME_RANGE);
        await discover.waitUntilTabIsLoaded();
      }
    );

    await spaceTest.step('open many tabs rapidly, then confirm each one loads', async () => {
      const newTabCount = 7;

      // Click without waiting between clicks to reproduce the rapid-open race.
      for (let i = 0; i < newTabCount; i++) {
        await discover.clickNewTabButton();
      }
      await discover.waitUntilTabIsLoaded();

      // The initial tab plus every rapidly-opened tab should be present.
      await expect(discover.getTabs()).toHaveCount(newTabCount + 1);

      // navigateToTabByIndex asserts each tab becomes active and finishes loading.
      for (let i = newTabCount - 1; i > 0; i--) {
        await discover.navigateToTabByIndex(i);
      }
    });
  });
});
