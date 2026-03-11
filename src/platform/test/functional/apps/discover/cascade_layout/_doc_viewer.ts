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

  describe('doc viewer', function () {
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

    const openDocViewerFlyout = async () => {
      await runCascadeQuery();

      const [firstRowId] = await getRootRowIds();

      await toggleRow(firstRowId);

      await retry.try(async () => {
        const leafGrid = await testSubjects.find('discoverCascadeCustomDataGridBody');
        expect(leafGrid).to.not.be(undefined);
      });

      const expandToggle = await find.byCssSelector(
        '[data-test-subj="discoverCascadeCustomDataGridBody"] [data-test-subj="docTableExpandToggleColumn"]'
      );
      await expandToggle.scrollIntoViewIfNecessary();
      await expandToggle.moveMouseTo();
      await expandToggle.click();

      await retry.waitFor('doc viewer flyout to open', async () => {
        return await testSubjects.exists('kbnDocViewer');
      });
    };

    it('should open the doc viewer flyout when clicking expand on a leaf row', async () => {
      await openDocViewerFlyout();
    });

    it('should navigate to the next document using the flyout pagination', async () => {
      await openDocViewerFlyout();

      await retry.waitFor('flyout navigation to be visible', async () => {
        return await testSubjects.exists('docViewerFlyoutNavigation');
      });

      expect(await testSubjects.exists('docViewerFlyoutNavigationPage-0')).to.be(true);

      await testSubjects.click('pagination-button-next');

      await retry.waitFor('page to advance to the next document', async () => {
        return await testSubjects.exists('docViewerFlyoutNavigationPage-1');
      });
    });
  });
}
