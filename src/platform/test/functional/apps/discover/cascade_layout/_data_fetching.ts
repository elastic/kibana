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

  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const inspector = getService('inspector');

  describe('grouping data fetching', function () {
    const statsQuery =
      'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';
    const cascadeRequestTitle = 'Cascade Row Data Query';

    const runCascadeQuery = async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isShowingCascadeLayout()).to.be(true);
    };

    const getRootRowIds = async () => {
      const rootRows = await find.allByCssSelector('[data-row-type="root"]');
      return Promise.all(rootRows.map(async (row) => (await row.getAttribute('id')) ?? ''));
    };

    const toggleRow = async (rowId: string) => {
      await testSubjects.click(`toggle-row-${rowId}-button`);
    };

    const getRequestTimestampFromStats = (requestStats: string[][]) => {
      const requestStatsRow = requestStats.find((row) => row?.[0]?.includes('Request timestamp'));
      return requestStatsRow?.[1] ?? '';
    };

    const getCascadeRequestTimestamp = async () => {
      await inspector.open();
      try {
        const requestNames = await inspector.getRequestNames();

        if (!requestNames) {
          return '';
        }

        const names = requestNames.split(',').map((name) => name.trim());
        if (!names.includes(cascadeRequestTitle)) {
          return '';
        }

        await inspector.openRequestByName(cascadeRequestTitle);
        const requestStats = await inspector.getTableData();
        return getRequestTimestampFromStats(requestStats);
      } finally {
        await inspector.close();
      }
    };

    const expectCascadeRequestTimestampToChange = async (baseline: string, waitForFetch = true) => {
      if (waitForFetch) {
        await discover.waitForDocTableLoadingComplete();
      }
      expect(await getCascadeRequestTimestamp()).not.to.be(baseline);
    };

    const expectCascadeRequestTimestampToStay = async (expected: string) => {
      await discover.waitForDocTableLoadingComplete();
      expect(await getCascadeRequestTimestamp()).to.be(expected);
    };

    it('does not refetch when returning to a previously expanded group', async () => {
      await runCascadeQuery();

      const [firstRowId, secondRowId] = await getRootRowIds();
      const baseline = await getCascadeRequestTimestamp();

      await toggleRow(firstRowId);
      await expectCascadeRequestTimestampToChange(baseline);

      const firstTimestamp = await getCascadeRequestTimestamp();

      await toggleRow(secondRowId);
      await expectCascadeRequestTimestampToChange(firstTimestamp);

      const secondTimestamp = await getCascadeRequestTimestamp();

      await toggleRow(firstRowId);
      await expectCascadeRequestTimestampToStay(secondTimestamp);
    });

    it('does not refetch when re-expanding a group after switching tabs', async () => {
      await runCascadeQuery();

      const [firstRowId] = await getRootRowIds();
      const baseline = await getCascadeRequestTimestamp();

      await toggleRow(firstRowId);
      await expectCascadeRequestTimestampToChange(baseline);

      const firstTimestamp = await getCascadeRequestTimestamp();

      await unifiedTabs.createNewTab();
      await runCascadeQuery();

      const [secondTabRowId] = await getRootRowIds();
      const secondTabBaseline = await getCascadeRequestTimestamp();

      await toggleRow(secondTabRowId);
      await expectCascadeRequestTimestampToChange(secondTabBaseline);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();

      await toggleRow(firstRowId);
      await expectCascadeRequestTimestampToStay(firstTimestamp);
    });

    it('keeps the fetch active when switching tabs quickly', async () => {
      await runCascadeQuery();
      await unifiedTabs.createNewTab();
      await runCascadeQuery();

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();

      const [firstRowId] = await getRootRowIds();
      const baseline = await getCascadeRequestTimestamp();

      await toggleRow(firstRowId);
      await unifiedTabs.selectTab(1);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();

      await expectCascadeRequestTimestampToChange(baseline, false);
    });
  });
}
