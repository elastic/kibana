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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings']);
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  describe('index pattern not found', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    it(`redirects to the main view if data view is missing`, async () => {
      await PageObjects.common.navigateToUrl('settings', 'kibana/dataViews/patterns/111111111111', {
        shouldUseHashForSubUrl: false,
      });

      await testSubjects.existOrFail('noDataViewsPrompt');
      const { message } = await toasts.getErrorByIndex();
      expect(message).to.contain(
        'The data view with id:111111111111 could not be loaded. Try creating a new one.'
      );
    });
  });
}
