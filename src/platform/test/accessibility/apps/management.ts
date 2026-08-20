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

// What remains here audits the data view management screens, which belong to
// @elastic/kibana-data-discovery; their Scout home is
// src/platform/plugins/shared/data_view_management/test/scout/ui/.
//
// The management landing page and the advanced settings page moved to Scout as
// part of https://github.com/elastic/kibana/issues/281240:
//   src/platform/plugins/shared/management/test/scout/ui/tests/management_a11y.spec.ts
//   src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_a11y.spec.ts
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'header',
    'indexPatternFieldEditorObjects',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');

  describe('Management', () => {
    describe('data views', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
        await kibanaServer.uiSettings.update({
          defaultIndex: 'logstash-*',
        });
        await PageObjects.settings.navigateTo();
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
        await esArchiver.unload(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
      });
      it('index pattern page', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await a11y.testAppSnapshot();
      });

      it('Single indexpattern view', async () => {
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await a11y.testAppSnapshot();
      });

      it('Index pattern field editor - initial view', async () => {
        await PageObjects.settings.clickAddField();
        await a11y.testAppSnapshot();
      });

      it('Index pattern field editor - all options shown', async () => {
        await PageObjects.settings.setFieldName('test');
        await PageObjects.settings.setFieldType('Keyword');
        await PageObjects.settings.setFieldScript("emit('hello world')");
        await PageObjects.settings.toggleRow('formatRow');
        await PageObjects.settings.setFieldFormat('string');
        await PageObjects.settings.toggleRow('customLabelRow');
        await PageObjects.settings.setCustomLabel('custom label');
        await testSubjects.click('toggleAdvancedSetting');
        // Let's make sure the field preview is visible before testing the snapshot
        const isFieldPreviewVisible =
          await PageObjects.indexPatternFieldEditorObjects.isFieldPreviewVisible();
        expect(isFieldPreviewVisible).to.be(true);

        await a11y.testAppSnapshot();

        await PageObjects.settings.closeIndexPatternFieldEditor();
      });

      it('Open create index pattern wizard', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await a11y.testAppSnapshot();
        await flyout.closeFlyout();
      });

      // We are navigating back to index pattern page to test field formatters
      it('Navigate back to logstash index page', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await a11y.testAppSnapshot();
      });

      it('Edit field type', async () => {
        await PageObjects.settings.clickEditFieldFormat();
        await a11y.testAppSnapshot();
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });
  });
}
