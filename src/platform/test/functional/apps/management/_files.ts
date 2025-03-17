/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'filesManagement']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Files management', () => {
    before(async () => {
      await PageObjects.filesManagement.navigateTo();
    });

    it(`should render an empty prompt`, async () => {
      await testSubjects.existOrFail('filesManagementApp');

      await retry.waitFor('Render empty files prompt', async () => {
        const pageText = await (await testSubjects.find('filesManagementApp')).getVisibleText();
        return pageText.includes('No files found');
      });
    });
  });
}
