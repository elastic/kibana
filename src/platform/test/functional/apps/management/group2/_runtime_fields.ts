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

/**
 * Migration recommendation: MIGRATE TO SCOUT. This is one create, edit, and delete journey for a
 * persisted runtime field. It uses the real _field_preview route against logstash data, the
 * change-type confirmation modal, and a format that must survive a reload. The data_view_field_editor
 * client-integration Jest tests (field_editor_flyout_content.test.ts,
 * field_editor_flyout_preview.test.ts) mock the preview response and never persist anything. The
 * serverless FTR suite at x-pack/platform/test/serverless/functional/test_suites/management/
 * data_views/_runtime_fields.ts is a near-identical copy (only navigation differs), so it is not
 * independent coverage. Migrate this once as a deployment-agnostic Scout spec, ideally merged
 * with _runtime_fields_composite.ts into one runtime_fields.spec.ts using steps, then delete both
 * FTR copies. The group1 _index_pattern_filter.ts runtime test also creates a runtime field through
 * the UI. Keep that one focused on the schema filter and do not repeat the create assertions.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);
  const testSubjects = getService('testSubjects');

  describe('runtime fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    describe('create runtime field', function describeIndexTests() {
      const fieldName = 'atest';

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Proves the preview renders from real
       * Elasticsearch data and that saving increments the persisted field count.
       */
      it('should create runtime field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount(), 10);
        await log.debug('add runtime field');
        await PageObjects.settings.addRuntimeField(
          fieldName,
          'Keyword',
          "emit('hello world')",
          false
        );

        await log.debug('check that field preview is rendered');
        await testSubjects.existOrFail('fieldPreviewItem', { timeout: 5000 });

        await PageObjects.settings.clickSaveField();

        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Changing type, script, and format on a saved
       * field goes through the `changeWarning` + confirm-save modal before persisting. Replace
       * the bare `testSubjects.find('changeWarning')` with an explicit visibility assertion.
       */
      it('should modify runtime field', async function () {
        await PageObjects.settings.filterField(fieldName);
        await testSubjects.click('editFieldFormat');
        await retry.try(async () => {
          await testSubjects.existOrFail('flyoutTitle');
        });
        await PageObjects.settings.setFieldType('Long');
        await PageObjects.settings.setFieldScriptWithoutToggle('emit(6);');
        await PageObjects.settings.toggleRow('formatRow');
        await PageObjects.settings.setFieldFormat('bytes');
        await testSubjects.find('changeWarning');
        await PageObjects.settings.clickSaveField();
        await PageObjects.settings.confirmSave();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Reopening the flyout must load the `bytes`
       * format from the saved data view. Fold this in as a step of the modify test.
       */
      it('verify field format', async function () {
        await testSubjects.click('editFieldFormat');
        const select = await testSubjects.find('editorSelectedFormatId');
        expect(await select.getAttribute('value')).to.be('bytes');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Deleting a persisted runtime field from the
       * list. This test has no assertion today, so the Scout version should check that the field
       * is gone and the fields tab count went back to its starting value.
       */
      it('should delete runtime field', async function () {
        await testSubjects.click('deleteField');
        await PageObjects.settings.confirmDelete();
      });
    });
  });
}
