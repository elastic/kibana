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

const ESQL_TEST_QUERY =
  'from logstash-* | limit 100 | stats countB = count(bytes) by geo.dest | sort countB';

spaceTest.describe('Discover new search action', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('resets filters and query in data view mode', async ({ pageObjects }) => {
    const { discover, filterBar, queryBar } = pageObjects;

    await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'png' });
    await discover.waitUntilSearchingHasFinished();
    await queryBar.setQuery('bytes > 15000');
    await discover.submitQuery();
    await discover.waitUntilSearchingHasFinished();

    expect(await discover.getHitCount()).toBe('353');
    expect(await filterBar.hasFilter({ field: 'extension', value: 'png' })).toBe(true);
    expect(await queryBar.getQuery()).toBe('bytes > 15000');

    await discover.clickNewSearch();

    expect(await discover.getHitCount()).toBe('14,004');
    expect(await filterBar.hasFilter({ field: 'extension', value: 'png' })).toBe(false);
    expect(await queryBar.getQuery()).toBe('');
  });

  spaceTest(
    'resets a saved search while preserving ad hoc data view mode',
    async ({ pageObjects }) => {
      const { discover, filterBar, queryBar } = pageObjects;
      const savedSearchName = `ad hoc data view search ${Date.now()}`;

      await discover.createDataViewFromSearchBar({
        name: 'logs',
        adHoc: true,
      });
      await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'css' });
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('bytes > 100');
      await discover.submitQuery();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getHitCount()).toBe('2,108');
      expect(await filterBar.hasFilter({ field: 'extension', value: 'css' })).toBe(true);
      expect(await queryBar.getQuery()).toBe('bytes > 100');

      await discover.saveSearch(savedSearchName);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).toBe('2,108');

      await discover.clickNewSearch();

      expect(await discover.getHitCount()).toBe('14,004');
      expect(await filterBar.hasFilter({ field: 'extension', value: 'css' })).toBe(false);
      expect(await queryBar.getQuery()).toBe('');
      expect(await discover.getSelectedDataViewName()).toBe('logs*');
      expect(await discover.isCurrentDataViewAdHoc()).toBe(true);
    }
  );

  spaceTest('resets unsaved ES query mode state', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    await discover.writeAndSubmitEsqlQuery(ESQL_TEST_QUERY);

    expect(await discover.getHitCountInt()).toBeGreaterThan(10);
    expect(await discover.getHistogramSuggestionType()).toBe('lensSuggestion');

    await discover.clickNewSearch();

    expect(await discover.getEsqlQueryValue()).toBe('FROM logstash-*');
    expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');
    expect(await discover.getHitCount()).toBe('1,000');
  });

  spaceTest('resets saved ES query mode state', async ({ pageObjects }) => {
    const { discover } = pageObjects;
    const savedSearchName = `esql search ${Date.now()}`;

    await discover.writeAndSubmitEsqlQuery(ESQL_TEST_QUERY);

    expect(await discover.getHitCountInt()).toBeGreaterThan(10);

    await discover.saveSearch(savedSearchName);
    await discover.waitUntilSearchingHasFinished();
    expect(await discover.getHitCountInt()).toBeGreaterThan(10);

    await discover.clickNewSearch();

    expect(await discover.getEsqlQueryValue()).toBe('FROM logstash-*');
    expect(await discover.getHitCount()).toBe('1,000');
  });
});
