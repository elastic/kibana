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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);

  describe('managed data view', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/managed_data_view'
      );
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    after(async function () {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/managed_data_view'
      );
    });

    describe('when viewing a managed data view', function () {
      it('can see managed badge in data view page', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();

        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('logstash-*');

        const managedBadge = await PageObjects.settings.getManagedTag();
        expect(managedBadge).to.be('Managed');
      });

      it('data view editor is disabled', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickEditIndexButton();

        await PageObjects.settings.expectDisabledDataViewEditor();
        await flyout.closeFlyout();
      });

      it('field editor is disabled', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickAddField();

        await PageObjects.settings.expectDisabledFieldEditor();
        await flyout.closeFlyout();
      });
    });
  });
}
