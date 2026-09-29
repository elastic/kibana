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

        // Retry the whole cancel-and-verify sequence a bounded number of times. This covers a
        // rare (~2-5%), non-deterministic 404 on the documents query's partial-results retrieval
        // GET that was confirmed NOT to be a reproducible bug in Kibana's client, Kibana's
        // server, or Elasticsearch itself: 800 iterations run directly against each of those
        // three layers in isolation (bypassing the other two) reproduced it zero times. It
        // appears to depend on real CI resource contention (browser + Kibana + two ES JVMs
        // competing for the same machine) that can't be forced synthetically outside a real FTR
        // run. See https://github.com/elastic/kibana/issues/246775 for the full investigation.
        await retry.try(async () => {
          // No-op on the first attempt, when there's no filter yet to remove.
          await filterBar.removeAllFilters().catch(() => {});

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
                "stall_time_seconds": 30
              }
            ]
          }
        }
      }`,
            false
          );

          // Wait for the async search to be established on ES so that cancellation can retrieve
          // partial results via the async search ID. The secondary button becoming enabled
          // signals SearchSessionState.Loading (after a 500ms delay). This is sufficient here
          // because stall_time_seconds: 30 guarantees the search is still running, and
          // wait_for_completion_timeout (200ms server contract) means the async-search ID is
          // set by the client well within the 500ms window — unlike ES|QL where DELAY() is
          // row-dependent and the task-poll is required to confirm continued execution.
          await testSubjects.waitForEnabled('queryCancelButton-secondary-button');
          await testSubjects.existOrFail('queryCancelButton');
          await testSubjects.click('queryCancelButton');
          await header.waitUntilLoadingHasFinished();

          // Warning callout is shown. Use a short timeout here (rather than the 2-minute
          // default) so a failed attempt is detected quickly and retried within retry.try's
          // overall budget.
          await testSubjects.existOrFail('searchResponseWarningsCallout', { timeout: 15_000 });
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
        // Wait for the accordion content to render before reading it
        await retry.waitFor(
          'cluster details callout to render',
          async () =>
            (await testSubjects.getVisibleText('inspectorRequestClustersDetails')).length > 0
        );
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
      /**
       * Migration recommendation: MIXED. Same as classic. Merge as a `test.step` of the CCS
       * cancel smoke. Keep the 746 hit count. Drop the hardcoded 5s sleep.
       */
      it('should show warning and results', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await timePicker.setDefaultAbsoluteRange();
        // DELAY(10ms) here is evaluated once per matching remote row (not once per block/page —
        // Case's lazy evaluator invokes each branch per-row), so its total wall-clock contribution
        // scales with the remote row count and isn't a value we should tune to "just barely win a
        // race" — see the state-based wait below instead of a larger constant here.
        await monacoEditor.setCodeEditorValue(`FROM logstash-*, ftr-remote:logstash-* METADATA _index
  | EVAL buckets = DATE_TRUNC(5 minute, @timestamp), delay = TO_STRING(CASE(STARTS_WITH(_index, "ftr-remote"), DELAY(10ms), false))
  | STATS count = COUNT(*) BY buckets, delay`);
        await testSubjects.click('querySubmitButton');

        // Wait for the secondary button to become enabled (signals SearchSessionState.Loading
        // after a 500ms delay). Record when it became enabled so the combined check below can
        // require an additional buffer for the async-search ID round-trip.
        await testSubjects.waitForEnabled('queryCancelButton-secondary-button');
        await testSubjects.existOrFail('queryCancelButton');
        const buttonEnabledAt = Date.now();

        // Combined liveness + response-received check, executed immediately before the click so
        // there is no sleep gap between the last confirmation and the action. Two conditions must
        // hold simultaneously:
        //
        //  1. Backend still computing: the compute/driver sub-task is only present while actively
        //     executing (action `indices:data/read/esql/compute*`, as used by the query_activity
        //     plugin). DELAY()'s wall-clock contribution scales with remote row count (it is
        //     evaluated per-row by Case's lazy evaluator, not per-block), so we poll rather than
        //     rely on a fixed constant — if this never becomes true the query finished before we
        //     could reach it, a real signal to increase the delay.
        //
        //  2. First async-search response received: the secondary button becoming enabled only
        //     guarantees ≥500ms since Loading state — it does not guarantee the client has received
        //     the first HTTP response carrying the async-search ID (used to retrieve partial results
        //     on cancel). Under CI load the round trip can exceed 500ms, leaving the ID unset.
        //     Requiring ≥500ms elapsed since button-enabled adds a bounded, deliberate margin
        //     (anchored to the server's wait_for_completion_timeout: 200ms contract) without a
        //     separate sleep between the liveness check and the click.
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
