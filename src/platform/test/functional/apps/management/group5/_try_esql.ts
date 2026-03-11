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
  const supertest = getService('supertest');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects(['settings', 'common', 'header', 'discover']);

  describe('No Data Views: Try ES|QL', () => {
    it('navigates to Discover and presents an ES|QL query', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();

      await retry.try(async () => {
        const response = await supertest.get('/api/data_views').set('kbn-xsrf', 'true').expect(200);
        for (const dv of response.body.data_view || []) {
          await supertest
            .delete(`/api/data_views/data_view/${dv.id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);
        }
        const verifyResponse = await supertest
          .get('/api/data_views')
          .set('kbn-xsrf', 'true')
          .expect(200);
        if ((verifyResponse.body.data_view || []).length > 0) {
          throw new Error('Data views still exist after deletion');
        }
      });

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('noDataViewsPrompt');
      await testSubjects.click('tryESQLLink');

      await PageObjects.discover.expectOnDiscover();
      const query = await monacoEditor.getCodeEditorValue();
      expect(query).to.be('FROM logs*');
    });
  });
}
