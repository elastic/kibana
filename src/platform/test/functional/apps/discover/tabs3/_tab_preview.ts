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
  const queryBar = getService('queryBar');
  const esql = getService('esql');
  const dataViews = getService('dataViews');
  const browser = getService('browser');

  const discoverSessionName = 'tab preview test';

  describe('tab preview', function () {
    it('should show the correct content', async () => {
      const checkTab0 = async () => {
        const tabPreviewContent = await unifiedTabs.getTabPreviewContent(0);
        expect(tabPreviewContent.title).to.be('Data view: logstash-*');
        expect(tabPreviewContent.query).to.be('');
        expect(tabPreviewContent.label).to.be('no query');
      };

      const checkTab1 = async () => {
        const tabPreviewContent = await unifiedTabs.getTabPreviewContent(1);
        expect(tabPreviewContent.title).to.be('Data view: logstash-*');
        expect(tabPreviewContent.query).to.be('bytes > 100');
        expect(tabPreviewContent.label).to.be('with query');
      };

      const checkTab2 = async () => {
        const tabPreviewContent = await unifiedTabs.getTabPreviewContent(2);
        expect(tabPreviewContent.title).to.be('Data view: logs*');
        expect(tabPreviewContent.query).to.be('');
        expect(tabPreviewContent.label).to.be('with different data view');
      };

      const checkTab3 = async () => {
        const tabPreviewContent = await unifiedTabs.getTabPreviewContent(3);
        expect(tabPreviewContent.title).to.be('');
        expect(tabPreviewContent.query).to.be(
          'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
        );
        expect(tabPreviewContent.label).to.be('esql');
      };

      await unifiedTabs.editTabLabel(0, 'no query');
      await discover.waitUntilTabIsLoaded();
      await checkTab0();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'with query');
      await queryBar.setQuery('bytes > 100');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await checkTab1();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(2, 'with different data view');
      await dataViews.createFromSearchBar({
        name: 'logs',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilTabIsLoaded();
      await checkTab2();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(3, 'esql');
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await esql.setEsqlEditorQuery(
        'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
      );
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();

      await checkTab0();
      await checkTab1();
      await checkTab2();
      await checkTab3();

      await browser.refresh();
      await discover.waitUntilTabIsLoaded();

      await checkTab0();
      await checkTab1();
      await checkTab2();
      await checkTab3();

      await discover.saveSearch(discoverSessionName);
      await discover.waitUntilTabIsLoaded();
      await discover.clickNewSearchButton();
      await discover.waitUntilTabIsLoaded();
      await discover.loadSavedSearch(discoverSessionName);
      await discover.waitUntilTabIsLoaded();

      await checkTab0();
      await checkTab1();
      await checkTab2();
      await checkTab3();
    });
  });
}
