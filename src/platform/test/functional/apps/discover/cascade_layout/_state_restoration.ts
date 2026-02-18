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
  const retry = getService('retry');

  describe('grouping state restoration', function () {
    const statsQuery =
      'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip | SORT count DESC';

    const runCascadeQuery = async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isShowingCascadeLayout()).to.be(true);
    };

    const expectScrollToBeRoughly = async (expected: number, tolerance = 150) => {
      await retry.tryForTime(5000, async () => {
        const actual = await discover.getCascadeLayoutScrollTop();
        expect(Math.abs(actual - expected)).to.be.lessThan(
          tolerance,
          `expected scroll position to be between ${expected - tolerance} and ${
            expected + tolerance
          } but got ${actual}`
        );
      });
    };

    it('restores cascade scroll position when switching tabs', async () => {
      await runCascadeQuery();
      await discover.scrollCascadeLayoutBy(2000);
      await expectScrollToBeRoughly(2000);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await expectScrollToBeRoughly(2000);
    });

    it('restores expanded state and nested scroll when switching tabs', async () => {
      await runCascadeQuery();
      await discover.scrollCascadeLayoutBy(2000);
      await expectScrollToBeRoughly(2000);
      const [firstRowId] = await discover.getCascadeLayoutRowIds();
      const initialRootScrollTop = await discover.getCascadeLayoutScrollTop();
      await discover.toggleCascadeLayoutRow(firstRowId);
      await discover.scrollCascadeLayoutBy(200);
      await expectScrollToBeRoughly(initialRootScrollTop + 200);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isCascadeLayoutRowExpanded(firstRowId)).to.be(true);
      await expectScrollToBeRoughly(initialRootScrollTop + 200, 300);
    });
  });
}
