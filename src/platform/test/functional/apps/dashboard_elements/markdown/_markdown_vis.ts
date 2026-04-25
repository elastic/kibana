/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, markdownVis } = getPageObjects(['dashboard', 'header', 'markdownVis']);
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const retry = getService('retry');

  const sample = {
    markdown: `# Original Heading 1
text
<h3>Inline HTML that should not be rendered as html</h3>
  `,
    result: `Original Heading 1\ntext`,
  };

  const modifiedSample = {
    markdown: `# Modified Heading 1
text
<h3>Inline HTML that should not be rendered as html</h3>
  `,
    result: `Modified Heading 1\ntext`,
  };

  describe('inline markdown visualization', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      // 1. adds markdown panel and saves
      const originalPanelCount = await dashboard.getPanelCount();
      await dashboardAddPanel.clickAddMarkdownPanel();
      await header.waitUntilLoadingHasFinished();
      await markdownVis.typeText(sample.markdown);
      await markdownVis.applyChanges();
      expect(await dashboard.getPanelCount()).to.eql(originalPanelCount + 1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('Markdown flow', async () => {
      // 2. does not add a panel when discarded immediately
      const originalPanelCount = await dashboard.getPanelCount();
      await dashboardAddPanel.clickAddMarkdownPanel();
      await header.waitUntilLoadingHasFinished();
      await markdownVis.discardChanges();

      await retry.try(
        async () => expect(await dashboard.getPanelCount()).to.eql(originalPanelCount),
        undefined,
        1000
      );

      // 3. edits markdown panel - handles preview and editor mode and discards unsaved changes
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      await markdownVis.typeText('text that wont be saved');
      await markdownVis.clickPreview();
      expect(await markdownVis.getRenderedText()).to.eql('text that wont be saved');
      await markdownVis.clickEditor();
      expect(await markdownVis.getEditedText()).to.eql('text that wont be saved');
      await markdownVis.discardChanges();
      expect(await markdownVis.getRenderedText()).to.eql(sample.result);

      // 4. edits markdown panel and saves
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      await markdownVis.typeText(modifiedSample.markdown);
      await markdownVis.applyChanges();
      expect(await markdownVis.getRenderedText()).to.eql(modifiedSample.result);
      expect(await markdownVis.getMarkdownTextByTag('h1')).to.equal('Modified Heading 1');
    });
  });
}
