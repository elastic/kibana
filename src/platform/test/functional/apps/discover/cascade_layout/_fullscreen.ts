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
  const { discover } = getPageObjects(['discover']);

  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');

  describe('fullscreen', function () {
    const statsQuery =
      'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';

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

    const isFullScreen = async () => {
      return await find.existsByCssSelector('.euiDataGrid--fullScreen');
    };

    const getRenderedRowCount = async () => {
      const rows = await find.allByCssSelector(
        '[data-test-subj="discoverCascadeCustomDataGridBody"] .euiDataGridRow'
      );
      return rows.length;
    };

    it('renders items in fullscreen mode after expanding a group', async () => {
      await runCascadeQuery();

      const [firstRowId] = await getRootRowIds();
      await toggleRow(firstRowId);
      await discover.waitForDocTableLoadingComplete();

      await retry.try(async () => {
        const rowCount = await getRenderedRowCount();
        expect(rowCount).to.be.greaterThan(0);
      });

      await testSubjects.click('dataGridFullScreenButton');

      await retry.try(async () => {
        expect(await isFullScreen()).to.be(true);
      });

      await retry.try(async () => {
        const fullScreenRowCount = await getRenderedRowCount();
        expect(fullScreenRowCount).to.be.greaterThan(0);
      });
    });

    it('exits fullscreen mode when the fullscreen button is clicked again', async () => {
      await runCascadeQuery();

      const [firstRowId] = await getRootRowIds();
      await toggleRow(firstRowId);
      await discover.waitForDocTableLoadingComplete();

      await testSubjects.click('dataGridFullScreenButton');

      await retry.try(async () => {
        expect(await isFullScreen()).to.be(true);
      });

      await testSubjects.click('dataGridFullScreenButton');

      await retry.try(async () => {
        expect(await isFullScreen()).to.be(false);
      });

      expect(await discover.isShowingCascadeLayout()).to.be(true);

      await retry.try(async () => {
        const rowCount = await getRenderedRowCount();
        expect(rowCount).to.be.greaterThan(0);
      });
    });
  });
}
