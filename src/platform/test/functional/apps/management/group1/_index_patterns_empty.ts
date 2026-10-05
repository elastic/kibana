/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. The empty-state-to-create journey is not covered elsewhere
 * and should migrate to Scout. The no-read-only-badge assertion is already covered by
 * data_views_feature_controls_security.spec.ts for an all-privileges user, so delete that FTR
 * test rather than duplicating it.
 */
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'settings']);
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const es = getService('es');

  describe('index pattern empty view', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.unload('src/platform/test/functional/fixtures/es_archiver/makelogs');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    after(async () => {
      await esArchiver.loadIfNeeded('src/platform/test/functional/fixtures/es_archiver/makelogs');
      await es.transport.request({
        path: '/logstash-a',
        method: 'DELETE',
      });
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. The empty Data Views list must react when an
     * index appears and allow the user to create a data view; the component Jest test only covers
     * static empty-prompt rendering.
     */
    // create index pattern and return to verify list
    it(`shows empty views`, async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      log.debug(
        `\n\nNOTE: If this test fails make sure there aren't any non-system indices in the _cat/indices output (use esArchiver.unload on them)`
      );
      log.debug(
        await es.transport.request({
          path: '/_cat/indices',
          method: 'GET',
        })
      );
      await testSubjects.existOrFail('createAnyway');

      await es.transport.request({
        path: '/logstash-a/_doc',
        method: 'POST',
        body: { user: 'matt', message: 20 },
      });
      await testSubjects.click('refreshIndicesButton');
      await testSubjects.existOrFail('createDataViewButton', { timeout: 5000 });
      await PageObjects.settings.createIndexPattern('logstash-*', '');
    });

    /**
     * Migration recommendation: DELETE. This is covered by
     * src/platform/plugins/shared/data_view_management/test/scout/ui/tests/
     * data_views_feature_controls_security.spec.ts (the all-privileges user has no badge).
     */
    it(`doesn't show read-only badge`, async () => {
      await globalNav.badgeMissingOrFail();
    });
  });
}
