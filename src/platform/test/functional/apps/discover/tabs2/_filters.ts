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
  const filterBar = getService('filterBar');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');

  describe('tab filters', function () {
    it('uses the correct query and filters', async () => {
      const checkTab0 = async () => {
        expect(await queryBar.getQueryString()).to.be('');
        expect(await filterBar.getFilterCount()).to.be(0);
        expect(await discover.getHitCount()).to.be('14,004');
        await testSubjects.existOrFail('xyVisChart');
      };

      const checkTab1 = async () => {
        expect(await queryBar.getQueryString()).to.be('bytes > 100');
        expect(await filterBar.getFilterCount()).to.be(1);
        expect(await filterBar.hasFilter('extension.raw', 'gif', true, false)).to.be(true);
        expect(await discover.getHitCount()).to.be('795');
        await testSubjects.existOrFail('xyVisChart');
      };

      const checkTab2 = async () => {
        expect(await queryBar.getQueryString()).to.be('machine.os: "ios"');
        expect(await filterBar.getFilterCount()).to.be(2);
        expect(await filterBar.hasFilter('@message', 'exists', true, false)).to.be(true);
        expect(await filterBar.hasFilter('extension.raw', 'jpg', true, true)).to.be(true);
        expect(await discover.getHitCount()).to.be('1,813');
        await testSubjects.existOrFail('xyVisChart');
      };

      const checkTab3 = async () => {
        expect(await esql.getEsqlEditorQuery()).to.be(
          'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
        );
        expect(await filterBar.getFilterCount()).to.be(0);
        expect(await discover.getHitCount()).to.be('721');
        await testSubjects.existOrFail('xyVisChart');
      };

      await unifiedTabs.editTabLabel(0, 'no filters');
      await discover.waitUntilTabIsLoaded();
      await checkTab0();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'query and app filters');
      await queryBar.setQuery('bytes > 100');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await filterBar.addFilter({ field: 'extension.raw', operation: 'is', value: 'gif' });
      await discover.waitUntilTabIsLoaded();
      await checkTab1();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(2, 'query, global and app filters');
      expect(await queryBar.getQueryString()).to.be('');
      expect(await filterBar.getFilterCount()).to.be(0);
      await filterBar.addFilter({ field: '@message', operation: 'exists' });
      await discover.waitUntilTabIsLoaded();
      await filterBar.addFilter({ field: 'extension.raw', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      await filterBar.toggleFilterPinned('extension.raw');
      await discover.waitUntilTabIsLoaded();
      await queryBar.setQuery('machine.os: "ios"');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await checkTab2();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(3, 'esql and no filters');
      expect(await queryBar.getQueryString()).to.be('');
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilter('extension.raw', 'jpg', true, true)).to.be(true);
      expect(await discover.getHitCount()).to.be('9,109');
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await esql.setEsqlEditorQuery(
        'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
      );
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();
      await checkTab3();

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await checkTab0();

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await checkTab1();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await checkTab2();

      await unifiedTabs.selectTab(3);
      await discover.waitUntilTabIsLoaded();
      await checkTab3();
    });
  });
}
