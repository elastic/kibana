/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visEditor, visChart, header, dashboard } = getPageObjects([
    'dashboard',
    'visEditor',
    'visChart',
    'header',
  ]);
  const find = getService('find');
  const inspector = getService('inspector');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const markdown = `
# Heading 1

<h3>Inline HTML that should not be rendered as html</h3>
  `;

  describe('markdown app', () => {
    before(async function () {
      await dashboard.initTests();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickAddMarkdownPanel();
      await visEditor.setMarkdownTxt(markdown);
      await visEditor.clickGo();
    });

    describe('markdown vis', () => {
      it('should not have inspector enabled', async function () {
        await inspector.expectIsNotEnabled();
      });

      it('should render markdown as html', async function () {
        const h1Txt = await visChart.getMarkdownBodyDescendentText('h1');
        expect(h1Txt).to.equal('Heading 1');
      });

      it('should not render html in markdown as html', async function () {
        const actual = await visChart.getMarkdownText();

        expect(actual).to.equal(
          'Heading 1\n<h3>Inline HTML that should not be rendered as html</h3>'
        );
      });

      it('should auto apply changes if auto mode is turned on', async function () {
        const markdown2 = '## Heading 2';
        await visEditor.toggleAutoMode();
        await visEditor.setMarkdownTxt(markdown2);
        await header.waitUntilLoadingHasFinished();
        const h1Txt = await visChart.getMarkdownBodyDescendentText('h2');
        expect(h1Txt).to.equal('Heading 2');
      });

      it('should resize the editor', async function () {
        const editorSidebar = await find.byCssSelector('.visEditor__collapsibleSidebar');
        const initialSize = await editorSidebar.getSize();
        await visEditor.sizeUpEditor();
        const afterSize = await editorSidebar.getSize();
        expect(afterSize.width).to.be.greaterThan(initialSize.width);
      });
    });
  });
}
