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
 * Migration recommendation: MIXED. See individual tests. The cancel button itself is covered
 * in src/platform/plugins/shared/unified_search/public/query_string_input/query_bar_top_row.test.tsx.
 * The unique value is cancelling a live CCS search and still getting local partial results
 * without a timeout toast. Scout's default servers have no CCS — keep one smoke on a CCS
 * stack. CCS-only file (see ./index.ts).
 */

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
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
      /**
       * Migration recommendation: MIXED. Keep one CCS smoke that cancel shows the warning
       * callout, inspector "incomplete" details, no timeout toast, and still returns the full
       * local 14,004 hits. Drop the hardcoded 5s sleep (wait for `queryCancelButton`).
       */
      it('should show warning and results', async () => {
        await common.navigateToApp('discover');
        await dataViews.createFromSearchBar({
          name: 'ftr-remote:logstash-*,logstash-*',
          hasTimeField: false,
          adHoc: true,
        });

        // Retry the whole sequence — see https://github.com/elastic/kibana/issues/246775.
        // Hit count must be inside the retry: the count query can produce the callout even
        // when the documents query fails, so asserting both ensures a real retry on failure.
        await retry.try(async () => {
          // No-op on the first attempt, when there's no filter yet to remove.
          await filterBar.removeAllFilters().catch(() => {});
          await discover.waitUntilSearchingHasFinished();

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
                "stall_time_seconds": 30
              }
            ]
          }
        }
      }`,
            false
          );

          // Secondary button enabled = SearchSessionState.Loading after 500ms delay,
          // which guarantees the async-search ID is set (see query_bar_top_row.tsx).
          await testSubjects.waitForEnabled('queryCancelButton-secondary-button');
          await testSubjects.existOrFail('queryCancelButton');
          await testSubjects.click('queryCancelButton');
          await header.waitUntilLoadingHasFinished();

          // Short timeout so a failed attempt is detected quickly and retried.
          await testSubjects.existOrFail('searchResponseWarningsCallout', { timeout: 15_000 });

          const hitCount = await discover.getHitCount();
          expect(hitCount).to.be('14,004');
        });

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
        await retry.waitFor(
          'cluster details callout to render',
          async () =>
            (await testSubjects.getVisibleText('inspectorRequestClustersDetails')).length > 0
        );
        const txt = await testSubjects.getVisibleText('inspectorRequestClustersDetails');
        expect(txt).to.contain('Results may be incomplete or empty.');
      });
    });

    describe('esql mode', () => {
      /**
       * Migration recommendation: MIXED. Same as classic. Merge as a `test.step` of the CCS
       * cancel smoke. Keep the 746 hit count. Drop the hardcoded 5s sleep.
       */
      it('should show warning and results', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await timePicker.setDefaultAbsoluteRange();
        // DELAY(10ms) is evaluated per remote row (not per block), so total duration scales
        // with row count — the state-based wait below is the timing anchor, not this value.
        await monacoEditor.setCodeEditorValue(`FROM logstash-*, ftr-remote:logstash-* METADATA _index
  | EVAL buckets = DATE_TRUNC(5 minute, @timestamp), delay = TO_STRING(CASE(STARTS_WITH(_index, "ftr-remote"), DELAY(10ms), false))
  | STATS count = COUNT(*) BY buckets, delay`);
        await testSubjects.click('querySubmitButton');

        // Wait for the secondary button — records when the async-search ID is ready client-side.
        await testSubjects.waitForEnabled('queryCancelButton-secondary-button');
        await testSubjects.existOrFail('queryCancelButton');
        const buttonEnabledAt = Date.now();

        // Poll until the ES|QL compute task is still running AND ≥500ms has elapsed since
        // button-enabled (covers round-trip jitter for the first async response). Click fires
        // immediately after — no sleep between the last check and the action.
        // See https://github.com/elastic/kibana/issues/246775 for the full rationale.
        await retry.waitFor(
          'esql compute task still running and response buffer elapsed',
          async () => {
            if (Date.now() - buttonEnabledAt < 500) return false;
            const { nodes } = await es.tasks.list({ actions: 'indices:data/read/esql/compute*' });
            return Object.values(nodes ?? {}).some(
              (node) => Object.keys(node.tasks ?? {}).length > 0
            );
          }
        );

        await testSubjects.click('queryCancelButton');
        await header.waitUntilLoadingHasFinished();

        // Warning callout is shown
        await testSubjects.existOrFail('searchResponseWarningsCallout');

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
