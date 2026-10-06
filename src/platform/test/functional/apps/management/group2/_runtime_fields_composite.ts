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
 * Migration recommendation: MIGRATE TO SCOUT. Composite runtime fields discover their subfields
 * from the real _field_preview response. The create and modify flows here depend on Elasticsearch
 * emitting `a.a`, then `a` and `b`, which the mocked preview in field_editor_flyout_preview.test.ts
 * ("composite runtime field") cannot prove. The serverless FTR copy at
 * x-pack/platform/test/serverless/functional/test_suites/management/data_views/
 * _runtime_fields_composite.ts differs only in navigation. Merge this into the same
 * deployment-agnostic runtime_fields.spec.ts as _runtime_fields.ts, then delete both FTR copies.
 * Replace the fixed `setTimeout` waits with web-first assertions on `typeField_N`.
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

    describe('create composite runtime field', function describeIndexTests() {
      // Starting with '@' to sort toward start of field list
      const fieldName = '@composite.test';

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Saving a composite field whose single subfield
       * is resolved from a real preview adds one entry to the persisted field list.
       */
      it('should create runtime field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount(), 10);
        await log.debug('add runtime field');
        await PageObjects.settings.addCompositeRuntimeField(
          fieldName,
          "emit('a.a','hello world')",
          false,
          1
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
       * Migration recommendation: MIGRATE TO SCOUT. Editing the script so it emits a second
       * subfield must re-resolve subfields from Elasticsearch and persist the extra one.
       */
      it('should modify runtime field', async function () {
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount(), 10);
        await PageObjects.settings.filterField(fieldName);
        await testSubjects.click('editFieldFormat');
        // wait for subfields to render
        await testSubjects.find(`typeField_0`);
        await new Promise((e) => setTimeout(e, 2000));
        await PageObjects.settings.setCompositeScript("emit('a',6);emit('b',10);");

        // wait for subfields to render
        await testSubjects.find(`typeField_1`);
        await new Promise((e) => setTimeout(e, 500));

        await PageObjects.settings.clickSaveField();
        await testSubjects.click('clearSearchButton');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Deleting the composite parent. There is no
       * assertion today; the Scout version should verify the parent and its subfields are removed.
       */
      it('should delete runtime field', async function () {
        await testSubjects.click('deleteField');
        await PageObjects.settings.confirmDelete();
      });
    });
  });
}
