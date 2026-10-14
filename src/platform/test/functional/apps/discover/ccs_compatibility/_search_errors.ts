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

/**
 * Migration recommendation: MIXED. See individual tests. Mapping shard failures / timeouts
 * onto warnings is covered in
 * src/platform/packages/shared/kbn-search-response-warnings/src/extract_warnings.test.ts.
 * The callout is covered in callout.test.tsx. The empty prompt is already shown in
 * src/platform/plugins/shared/discover/test/scout/core2/ui/parallel_tests/async_scripted_fields.spec.ts.
 */

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const { common, discover, timePicker } = getPageObjects(['common', 'discover', 'timePicker']);

  const isCcsTest = config.get('esTestCluster.ccs');
  const archiveDirectory = isCcsTest
    ? 'src/platform/test/functional/fixtures/kbn_archiver/ccs/discover.json'
    : 'src/platform/test/functional/fixtures/kbn_archiver/discover.json';
  const esNode = isCcsTest
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');

  const defaultIndex = isCcsTest ? 'ftr-remote:logstash-*' : 'logstash-*';

  describe('discover search errors', () => {
    before(async () => {
      await kibanaServer.importExport.load(archiveDirectory);
      await esNode.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(archiveDirectory);
      await esNode.unload('src/platform/test/functional/fixtures/es_archiver/logstash_functional');
    });

    /**
     * Migration recommendation: MIXED. extract_warnings.test.ts already covers shard failures →
     * incomplete warning. Keep a Scout smoke that Discover shows
     * `searchResponseWarningsCallout` and that the hit count drops from 14,004 to 9,247 — that
     * number is the proof only the failed shard was lost.
     */
    it('exception on single shard shows warning and results', async () => {
      await common.navigateToApp('discover');
      await dataViews.switchToAndValidate(defaultIndex);
      await timePicker.setDefaultAbsoluteRange();
      await retry.try(async () => {
        const hitCount = await discover.getHitCount();
        expect(hitCount).to.be('14,004');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex.slice(0, defaultIndex.length - 1)}2015.09.20",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure documents are still returned for the successful shards
      await retry.try(async function tryingForTime() {
        const hitCount = await discover.getHitCount({ isPartial: true });
        expect(hitCount).to.be('9,247');
      });

      // Ensure a warning is shown
      await testSubjects.exists('searchResponseWarningsCallout');
    });

    /**
     * Migration recommendation: DELETE. The empty prompt is already covered in
     * async_scripted_fields.spec.ts. All-shards-failed → warning extraction is in
     * extract_warnings.test.ts.
     */
    it('exception on all shards shows error', async () => {
      await common.navigateToApp('discover');
      await dataViews.switchToAndValidate(defaultIndex);
      await timePicker.setDefaultAbsoluteRange();
      await retry.try(async () => {
        const hitCount = await discover.getHitCount();
        expect(hitCount).to.be('14,004');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex}",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure an error is shown
      await testSubjects.exists('searchResponseWarningsEmptyPrompt');
    });
  });
}
