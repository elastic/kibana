/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs } = getPageObjects(['discover', 'unifiedTabs']);
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const dataViews = getService('dataViews');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');

  describe('new tab', function () {
    it('should create a new tab in classic mode', async () => {
      // tab 0 - with the default data view

      // tab 1 - create a new tab, create another data view from search bar, set query and filter
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await dataViews.createFromSearchBar({
        name: 'logsta',
        hasTimeField: true,
      });
      await discover.waitUntilTabIsLoaded();

      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpeg' });
      const query = 'machine.os: "macOS"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      // tab 2 - create another new tab in ES|QL mode
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      expect(await esql.getEsqlEditorQuery()).to.be('FROM logsta*');

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await dataViews.getSelectedName()).to.be('logstash-*');
      expect(await queryBar.getQueryString()).to.be('');
      expect(await filterBar.getFilterCount()).to.be(0);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await dataViews.getSelectedName()).to.be('logsta*');
      expect(await queryBar.getQueryString()).to.be(query);
      expect(await filterBar.getFilterCount()).to.be(1);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await dataViews.getSelectedName()).to.be('logsta*');
      expect(await queryBar.getQueryString()).to.be('');
      expect(await filterBar.getFilterCount()).to.be(0);
    });

    it('should create a new tab in ES|QL mode', async () => {
      // tab 0 - with the non-default data view
      await dataViews.createFromSearchBar({
        name: 'logst',
        hasTimeField: true,
      });

      // tab 1 - create another new tab in ES|QL mode
      const defaultQuery = 'FROM logst*';
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      expect(await esql.getEsqlEditorQuery()).to.be(defaultQuery);
      const updatedQuery = 'FROM logst* | LIMIT 1050';
      await esql.setEsqlEditorQuery(updatedQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await esql.getEsqlEditorQuery()).to.be(updatedQuery);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await esql.getEsqlEditorQuery()).to.be(defaultQuery);
    });
  });
}
