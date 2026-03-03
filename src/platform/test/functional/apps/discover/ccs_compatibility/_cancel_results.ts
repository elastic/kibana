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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const { common, discover, header, timePicker } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
  ]);
  const dataViews = getService('dataViews');
  const monacoEditor = getService('monacoEditor');

  const esArchiver = getService('esArchiver');
  const remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');

  describe('discover search CCS cancel', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await remoteEsArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover.json'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await remoteEsArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover.json'
      );
    });

    describe('classic mode', () => {
      it('should show warning and results', async () => {
        await common.navigateToApp('discover');
        await dataViews.createFromSearchBar({
          name: 'ftr-remote:logstash-*,logstash-*',
          hasTimeField: false,
          adHoc: true,
        });

        // Add a stall time to the remote indices
        await filterBar.addDslFilter(
          `
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "*:*",
                "error_type": "exception",
                "message": "'Watch out!'",
                "stall_time_seconds": 5
              }
            ]
          }
        }
      }`,
          false
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await testSubjects.exists('queryCancelButton');
        await testSubjects.click('queryCancelButton');

        // Warning callout is shown
        await testSubjects.exists('searchResponseWarningsCallout');

        // No "timed out" error notification is shown
        await toasts.assertCount(0);

        // View cluster details shows timed out
        await testSubjects.click('searchResponseWarningsViewDetails');

        // If both requests have already completed, it will show a context menu first, otherwise it
        // will go directly to the details
        if (await testSubjects.exists('viewDetailsContextMenu')) {
          await testSubjects.click('viewDetailsContextMenu');
        }

        await testSubjects.click('inspectorRequestToggleClusterDetailsftr-remote');
        const txt = await testSubjects.getVisibleText('inspectorRequestClustersDetails');
        expect(txt).to.contain('Results may be incomplete or empty.');

        // Ensure documents are still returned for the successful shards
        await retry.try(async function tryingForTime() {
          const hitCount = await discover.getHitCount();
          expect(hitCount).to.be('14,004');
        });
      });
    });

    describe('esql mode', () => {
      it('should show warning and results', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(`FROM logstash-*, ftr-remote:logstash-* METADATA _index
  | EVAL buckets = DATE_TRUNC(5 minute, @timestamp), delay = TO_STRING(CASE(STARTS_WITH(_index, "ftr-remote"), DELAY(10ms), false))
  | STATS count = COUNT(*) BY buckets, delay`);
        await timePicker.setDefaultAbsoluteRange();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await testSubjects.exists('queryCancelButton');
        await testSubjects.click('queryCancelButton');

        await header.waitUntilLoadingHasFinished();
        // Warning callout is shown
        await testSubjects.exists('searchResponseWarningsCallout');

        // No "timed out" error notification is shown
        await toasts.assertCount(0);

        // View cluster details shows timed out
        await testSubjects.click('searchResponseWarningsViewDetails');

        await testSubjects.click('inspectorRequestToggleClusterDetailsftr-remote');
        const txt = await testSubjects.getVisibleText(
          'inspectorRequestClustersTableCell-Status-ftr-remote'
        );
        expect(txt).to.be('partial');

        // Ensure documents are still returned for the successful shards
        await retry.try(async () => {
          const hitCount = await discover.getHitCount({ isPartial: true });
          expect(hitCount).to.be('746');
        });
      });
    });
  });
}
