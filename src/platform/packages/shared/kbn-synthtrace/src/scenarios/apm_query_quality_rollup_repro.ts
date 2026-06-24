/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Combined repro for two rollup / source-resolution symptoms relevant to the APM "Query Quality"
 * advanced settings PoC. Both rely on the same idea: APM views read pre-aggregated metrics at a
 * `rollupInterval` chosen from the requested bucket count, so manipulating a single rollup tier for
 * a service/transaction changes what shows up.
 *
 * Both parts anchor their data to the end of the range (`range.to`), so the scenario works with
 * synthtrace's default `1m` window (no `--from`/`--to`):
 *     node scripts/synthtrace apm_query_quality_rollup_repro
 * Pass a wider `--from` if you want more history (e.g. `--from=now-7d --to=now`).
 *
 * Part A - Transaction-group rollup timestamp mismatch
 * ----------------------------------------------------
 * One service (`synth-rollup-mismatch-compensation-eco-sync`, transaction type `exec`) with two
 * transaction groups:
 *   - `VisibleTransactionDefault`   - appears in both "Last 24 hours" and "Last 48 hours"
 *   - `InvisibleTransactionDefault` - its trace sample is within 24h, but its 60m transaction metric
 *                                     is shifted ~8h further back so it falls outside the 24h range
 * Symptom: the transaction group is missing in "Last 24 hours" but appears in "Last 48 hours", even
 * though a trace sample exists within the last 24 hours. The long transaction is ~46 minutes.
 *
 * Part B - Table query quality source visibility
 * ----------------------------------------------
 * Three steady services so synthtrace emits 1m/10m/60m `service_transaction` rollups:
 *   - `synth-quality-baseline-a` / `synth-quality-baseline-b` - full rollups, always listed
 *   - `synth-quality-accurate-only`                            - 60m metrics dropped in the pipeline
 * The Service Inventory list (`GET /internal/apm/services`) queries the `documentType`/`rollupInterval`
 * chosen by `usePreferredDataSourceAndBucketSize({ intent: 'table' })`. With the Kibana time picker
 * set to "Last 24 hours":
 *     fastest / fast / default -> ServiceTransactionMetric @ 60m  (accurate-only service hidden)
 *     accurate / mostAccurate  -> ServiceTransactionMetric @ 10m  (accurate-only service visible)
 * Toggle Stack Management -> Advanced Settings -> "Table query quality"
 * (`observability:apmQueryQualityTables`) between `default` and `accurate` and refresh to see it.
 *
 * IMPORTANT - the Part B effect is time-window sensitive in the KIBANA TIME PICKER (not the ingest
 * range). The table source only resolves to 60m at `default` AND to 10m at `accurate` for a picker
 * window of roughly 15-36h, so set the Kibana time picker to "Last 24 hours". For WIDER picker
 * windows (e.g. Last 7 days) even `accurate` resolves to 60m, so the accurate-only service stays
 * hidden at every quality level (it looks like it "never shows"). For much NARROWER windows (e.g.
 * Last 15 minutes) the source resolves to 1m at every level, so it is always visible.
 *
 * Notes:
 * - All services share one `service.environment` (derived from this filename + optional `suffix`
 *   scenarioOpt) so a run can be isolated for validation.
 *
 * How to validate (Kibana Dev Tools):
 * - Part A: trace sample within 24h but 60m metric shifted out of 24h:
 *   POST /traces-apm*\/_search
 *   { "size": 5, "query": { "bool": { "filter": [
 *     { "term": { "service.environment": "<ENVIRONMENT_FROM_SCENARIO>" } },
 *     { "term": { "service.name": "synth-rollup-mismatch-compensation-eco-sync" } },
 *     { "term": { "processor.event": "transaction" } },
 *     { "term": { "transaction.name": "InvisibleTransactionDefault" } }
 *   ] } }, "sort": [{ "@timestamp": "desc" }] }
 *
 *   POST /metrics-apm*\/_search
 *   { "size": 5, "query": { "bool": { "filter": [
 *     { "term": { "service.environment": "<ENVIRONMENT_FROM_SCENARIO>" } },
 *     { "term": { "service.name": "synth-rollup-mismatch-compensation-eco-sync" } },
 *     { "term": { "metricset.name": "transaction" } },
 *     { "term": { "metricset.interval": "60m" } },
 *     { "term": { "transaction.name": "InvisibleTransactionDefault" } }
 *   ] } }, "sort": [{ "@timestamp": "desc" }] }
 *
 * - Part B: accurate-only service has 10m metrics but no 60m metrics:
 *   POST /metrics-apm*\/_search
 *   { "size": 2, "query": { "bool": { "filter": [
 *     { "term": { "service.environment": "<ENVIRONMENT_FROM_SCENARIO>" } },
 *     { "term": { "service.name": "synth-quality-accurate-only" } },
 *     { "term": { "metricset.name": "service_transaction" } },
 *     { "term": { "metricset.interval": "10m" } }
 *   ] } } }
 *   (swap "10m" for "60m" -> expect zero hits)
 */
import { Readable, Transform } from 'stream';
import type { ApmFields } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, httpExitSpan } from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

// Part A - transaction-group rollup timestamp mismatch
const MISMATCH_SERVICE_BASE = 'synth-rollup-mismatch-compensation-eco-sync';
const MISMATCH_TRANSACTION_TYPE = 'exec';
const VISIBLE_IN_DEFAULT = 'VisibleTransactionDefault';
const HIDDEN_IN_DEFAULT = 'InvisibleTransactionDefault';
const LONG_TRANSACTION_DURATION_MS = 46 * 60 * 1000;
const METRIC_TIMESTAMP_SHIFT_MS = 8 * 60 * 60 * 1000;

// Part B - table query quality source visibility
const BASELINE_A_BASE = 'synth-quality-baseline-a';
const BASELINE_B_BASE = 'synth-quality-baseline-b';
const ACCURATE_ONLY_BASE = 'synth-quality-accurate-only';
const STEADY_TRANSACTION_TYPE = 'request';
const STEADY_TRANSACTION_NAME = 'GET /';
const COARSE_ROLLUP_INTERVAL = '60m';

// Always backfill at least this much data anchored to `range.to`, so both parts emit the relevant
// 1m/10m/60m rollups even when run with synthtrace's default `1m` window. A wider explicit `--from`
// is still honored.
const MIN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const STEP_MS = 60 * 1000;

function toSafeSuffix(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function getField(doc: Record<string, unknown>, flatKey: string, path: string[]): unknown {
  if (doc[flatKey] !== undefined) {
    return doc[flatKey];
  }

  let current: unknown = doc;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }: ScenarioInitOptions) => {
  const suffix = toSafeSuffix((scenarioOpts as Record<string, unknown> | undefined)?.suffix);
  const environment = getSynthtraceEnvironment(__filename, suffix);

  const mismatchServiceName = suffix ? `${MISMATCH_SERVICE_BASE}-${suffix}` : MISMATCH_SERVICE_BASE;
  const baselineAName = suffix ? `${BASELINE_A_BASE}-${suffix}` : BASELINE_A_BASE;
  const baselineBName = suffix ? `${BASELINE_B_BASE}-${suffix}` : BASELINE_B_BASE;
  const accurateOnlyName = suffix ? `${ACCURATE_ONLY_BASE}-${suffix}` : ACCURATE_ONLY_BASE;

  return {
    setupPipeline: ({ apmEsClient }) => {
      const basePipeline = apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Default, {
        includePipelineSerialization: true,
      });

      apmEsClient.setPipeline((base) => {
        const rollupRewriteTransform = new Transform({
          objectMode: true,
          transform(doc: Record<string, unknown>, _encoding, callback) {
            const processorEvent = getField(doc, 'processor.event', ['processor', 'event']);
            const serviceName = getField(doc, 'service.name', ['service', 'name']);
            const metricsetName = getField(doc, 'metricset.name', ['metricset', 'name']);
            const metricsetInterval = getField(doc, 'metricset.interval', [
              'metricset',
              'interval',
            ]);
            const transactionName = getField(doc, 'transaction.name', ['transaction', 'name']);

            // Part B: drop the 60m metrics for the accurate-only service.
            const isCoarseRollupForAccurateOnly =
              processorEvent === 'metric' &&
              serviceName === accurateOnlyName &&
              metricsetInterval === COARSE_ROLLUP_INTERVAL;

            if (isCoarseRollupForAccurateOnly) {
              callback(null);
              return;
            }

            // Part A: shift the hidden transaction group's 60m transaction metric back in time.
            const isHiddenTransactionMetric =
              processorEvent === 'metric' &&
              metricsetName === 'transaction' &&
              metricsetInterval === COARSE_ROLLUP_INTERVAL &&
              serviceName === mismatchServiceName &&
              transactionName === HIDDEN_IN_DEFAULT;

            if (isHiddenTransactionMetric) {
              const ts = doc['@timestamp'];
              if (typeof ts === 'number') {
                doc['@timestamp'] = ts - METRIC_TIMESTAMP_SHIFT_MS;
              } else if (typeof ts === 'string') {
                const parsed = Date.parse(ts);
                if (!Number.isNaN(parsed)) {
                  doc['@timestamp'] = parsed - METRIC_TIMESTAMP_SHIFT_MS;
                }
              }
            }

            callback(null, doc);
          },
        });

        const piped = basePipeline(base) as unknown as NodeJS.ReadWriteStream;
        return piped.pipe(rollupRewriteTransform) as unknown as NodeJS.WritableStream;
      });

      logger.info(
        `Shifting 60m metrics for ${HIDDEN_IN_DEFAULT} (${mismatchServiceName}) by ${METRIC_TIMESTAMP_SHIFT_MS}ms and dropping ${COARSE_ROLLUP_INTERVAL} metrics for ${accurateOnlyName} (service.environment=${environment})`
      );
    },

    generate: ({ clients: { apmEsClient }, range }) => {
      const now = range.to.getTime();
      // Anchor both parts to a fixed lookback so a default (`1m`) run still backfills ~24h.
      const from = Math.min(range.from.getTime(), now - MIN_LOOKBACK_MS);

      // Part A - transaction-group rollup timestamp mismatch.
      const mismatchService = apm
        .service({ name: mismatchServiceName, environment, agentName: 'dotnet' })
        .instance('instance-a');

      const tsLong = now - 17 * 60 * 60 * 1000;
      const tsRange1 = now - 2 * 60 * 60 * 1000;
      const tsRange2 = now - 3 * 60 * 60 * 1000;

      const mismatchEvents = [
        mismatchService
          .transaction({
            transactionName: VISIBLE_IN_DEFAULT,
            transactionType: MISMATCH_TRANSACTION_TYPE,
          })
          .timestamp(tsRange1)
          .duration(38 * 60 * 1000)
          .success(),
        mismatchService
          .transaction({
            transactionName: VISIBLE_IN_DEFAULT,
            transactionType: MISMATCH_TRANSACTION_TYPE,
          })
          .timestamp(tsRange2)
          .duration(33 * 60 * 1000)
          .success(),
        mismatchService
          .transaction({
            transactionName: HIDDEN_IN_DEFAULT,
            transactionType: MISMATCH_TRANSACTION_TYPE,
          })
          .timestamp(tsLong)
          .duration(LONG_TRANSACTION_DURATION_MS)
          .success()
          .children(
            mismatchService
              .span(
                httpExitSpan({
                  spanName: 'Publish to topic.entitychanges with transaction',
                  destinationUrl: 'http://service-bus:8080',
                })
              )
              .timestamp(tsLong + 30 * 1000)
              .duration(2 * 60 * 1000)
              .success()
          ),
      ];

      // Part B - table query quality source visibility.
      const baselineA = apm
        .service({ name: baselineAName, environment, agentName: 'go' })
        .instance('instance-a');
      const baselineB = apm
        .service({ name: baselineBName, environment, agentName: 'nodejs' })
        .instance('instance-b');
      const accurateOnly = apm
        .service({ name: accurateOnlyName, environment, agentName: 'java' })
        .instance('instance-c');

      const steadyServices = [baselineA, baselineB, accurateOnly];

      const steadyEvents: ReturnType<typeof baselineA.transaction>[] = [];
      for (let ts = from + STEP_MS; ts < now; ts += STEP_MS) {
        for (const service of steadyServices) {
          steadyEvents.push(
            service
              .transaction({
                transactionName: STEADY_TRANSACTION_NAME,
                transactionType: STEADY_TRANSACTION_TYPE,
              })
              .timestamp(ts)
              .duration(150)
              .success()
          );
        }
      }

      // The streaming metric aggregators (1m/10m/60m rollups) assume ascending @timestamp order:
      // the first event seen fixes the flush boundary, so feeding the out-of-order Part A events
      // before the Part B stream prevents the coarse rollups from flushing. Merge-sort everything by
      // timestamp and pass the events as real Serializables (not pre-serialized) so the default
      // pipeline emits the full 1m/10m/60m rollup tiers.
      const orderedEvents = [...mismatchEvents, ...steadyEvents].sort(
        (a, b) => (a.fields['@timestamp'] ?? 0) - (b.fields['@timestamp'] ?? 0)
      );

      return withClient(apmEsClient, Readable.from(orderedEvents));
    },
  };
};

export default scenario;
