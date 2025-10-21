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
  const browser = getService('browser');

  describe('grouping selection', function () {
    it('should display grouping selector for valid supported ES|QL queries', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('data-cascade')).to.be(true);
      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);
    });

    it('should switch to back to classic mode from the grouped experience without any errors', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('data-cascade')).to.be(true);
      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);

      await testSubjects.click('switch-to-dataviews');
    });

    it('revert to the non-group experience when the none option is selected', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);

      await testSubjects.click('discoverEnableCascadeLayoutSwitch');

      expect(await testSubjects.exists('discoverGroupBySelectionList')).to.be(true);

      await testSubjects.click('discoverCascadeLayoutOptOutButton');

      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('data-cascade')).not.to.be(true);
    });

    it('should display row action context menu when row context action button is clicked', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('data-cascade')).to.be(true);
      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);

      // click the first group row context action button
      await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
      expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);
    });

    it('should copy to clipboard when copy to clipboard context menu item is clicked', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('data-cascade')).to.be(true);
      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);

      // click the first group row context action button
      await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
      expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

      // click the copy to clipboard context menu item
      await testSubjects.click('dscCascadeRowContextActionCopyToClipboard');
      expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(false);

      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');

      if (canReadClipboard) {
        const clipboardText = await browser.getClipboardValue();
        // expect the clipboard text to be a valid IP address pattern
        expect(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clipboardText)).to.be(true);
      }
    });
  });
}
