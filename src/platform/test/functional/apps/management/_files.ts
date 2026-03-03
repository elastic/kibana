/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'filesManagement']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const fileRoute = '/api/files/files/defaultImage';

  describe('Files management', () => {
    let createdFileIds: string[] = [];

    before(async () => {
      await PageObjects.filesManagement.navigateTo();
    });

    after(async () => {
      for (const fileId of createdFileIds) {
        await supertest.delete(`${fileRoute}/${fileId}`).set('kbn-xsrf', 'xxx');
      }
      createdFileIds = [];
    });

    it(`should render an empty prompt`, async () => {
      await testSubjects.existOrFail('filesManagementApp');

      await retry.waitFor('Render empty files prompt', async () => {
        const pageText = await (await testSubjects.find('filesManagementApp')).getVisibleText();
        return pageText.includes('No files found');
      });
    });

    it('should display charts in diagnostics flyout if any files exist', async () => {
      const createFileResponse = await supertest.post(fileRoute).set('kbn-xsrf', 'xxx').send({
        name: 'test',
        mimeType: 'image/png',
      });

      const createdFileId = createFileResponse.body.file.id;
      createdFileIds.push(createdFileId);

      await testSubjects.click('filesManagementOpenDiagnosticsFlyoutButton');
      await testSubjects.existOrFail('diagnosticsFlyout');

      await retry.waitFor('Display charts', async () => {
        const flyoutText = await (await testSubjects.find('diagnosticsFlyout')).getVisibleText();
        return flyoutText.includes('Count by extension') && flyoutText.includes('Count by status');
      });
    });
  });
}
