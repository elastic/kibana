/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GOAL
 * ----
 * Produce APM data that, once APM anomaly-detection ML jobs are created and run,
 * surfaces anomaly badges in the APM UI that exercise the multi-detector /
 * multi-environment anomaly badge behaviour:
 *
 *   1. Highest score ACROSS DETECTORS (latency vs throughput vs failure rate):
 *      `synth-anomaly-detectors` (env: production) gets a CRITICAL failure-rate
 *      anomaly together with only a MINOR latency bump in the same window. The
 *      badge must show the failure-rate (critical) score, not the latency one.
 *
 *   2. Highest score ACROSS ENVIRONMENTS (when env selector = "all"):
 *      `synth-anomaly-environments` exists in two environments. `production`
 *      gets a CRITICAL latency spike, `development` only a MINOR one. With no
 *      environment selected the badge must show the production (critical) score.
 *
 *   3. Throughput detector coverage:
 *      `synth-anomaly-throughput` (env: production) gets a large throughput
 *      spike in the anomaly window.
 *
 * APM ML DETECTORS (what each service is engineered to trip)
 * ---------------------------------------------------------
 * APM anomaly jobs run three detectors, all `by "transaction.type"` and
 * `partition_field_name="service.name"` (indices match
 * common/anomaly_detection/apm_ml_detectors.ts):
 *
 *   - index 0  high_mean(transaction_latency)       -> latency, HIGH only
 *   - index 1  mean(transaction_throughput)         -> throughput, EITHER way
 *   - index 2  high_mean(failed_transaction_rate)   -> failure rate, HIGH only
 *
 * Because latency and failure rate use `high_mean`, their anomalies must be
 * UPWARD deviations; throughput uses `mean`, so a large UP spike works too.
 * Detector -> service mapping engineered below:
 *   - detector 2 (failure rate, CRITICAL) + detector 0 (latency, MINOR)
 *       -> synth-anomaly-detectors / production
 *   - detector 0 (latency, CRITICAL in prod, MINOR in dev)
 *       -> synth-anomaly-environments / production + development
 *   - detector 1 (throughput, CRITICAL)
 *       -> synth-anomaly-throughput / production
 *
 * DATA SHAPE
 * ----------
 * - Type: APM transactions (traces-apm and metrics-apm indices).
 *   transaction.type=request so it matches the detectors above. The ML jobs read
 *   the aggregated transaction metrics (metrics-apm*), which synthtrace produces
 *   automatically via its transaction-metrics aggregators.
 * - A long flat BASELINE over the whole range lets ML learn a normal model, then
 *   a short ANOMALY WINDOW at the end (default: last 2h) injects the deviations.
 *
 * RUNNING (IMPORTANT: do NOT use --live)
 * --------------------------------------
 * This scenario relies on a historical baseline followed by a trailing spike, so
 * it must be ingested over a fixed past range. In `--live` mode every generated
 * bucket is in the anomaly window (anomalyStart is fixed at process start), so
 * there is no baseline and the elevated values are flat -> ML learns them as
 * "normal" and never flags an anomaly. Always run a fixed window, e.g.:
 *
 *   node scripts/synthtrace apm_anomalies_multi_detector_env \
 *     --from=now-2d --to=now --clean
 *
 * A wider baseline (e.g. --from=now-7d) gives ML more normal history and makes
 * the trailing spike stand out more. Note that a 1-hour range with the default
 * 2h anomaly window leaves no baseline; pick a range wider than the window.
 *
 * SCENARIO OPTS
 * -------------
 * --scenarioOpts.anomalyWindowHours=2   How many trailing hours are anomalous.
 * --scenarioOpts.baselineRate=10        Transactions per minute during baseline.
 *
 * VALIDATE + ML SETUP
 * -------------------
 * Ingesting data is not enough for the badges to appear: APM anomaly badges read
 * from ML anomaly-detection jobs. After ingesting, create APM ML jobs (APM >
 * Settings > Anomaly detection) for the `production` and `development`
 * environments and run their datafeeds over the ingested range, then check the
 * badges in the Service inventory, Service detail header and Service map popover.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const TRANSACTION_NAME = 'GET /api/orders';

const DEFAULT_SCENARIO_OPTS = {
  anomalyWindowHours: 2,
  // 10 tx/min gives the transaction-metrics aggregations enough samples per
  // bucket for ML to build a stable baseline (2/min is too sparse and noisy).
  baselineRate: 10,
};

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { anomalyWindowHours, baselineRate } = {
    ...DEFAULT_SCENARIO_OPTS,
    ...(runOptions.scenarioOpts || {}),
  };

  // The anomaly window is the trailing `anomalyWindowHours` of the run range.
  // `--to now` means the range end is ~Date.now(), so anchoring off `now` keeps
  // the anomalous buckets inside whatever range the caller passes.
  const anomalyStart = Date.now() - Number(anomalyWindowHours) * 60 * 60 * 1000;
  const isAnomalous = (timestamp: number) => timestamp >= anomalyStart;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // 1) Multiple detectors on one service/environment. Trips detector 2
      //    high_mean(failed_transaction_rate) hard and detector 0
      //    high_mean(transaction_latency) lightly, so the surfaced badge score
      //    must come from failure rate.
      const detectorsInstance = apm
        .service({ name: 'synth-anomaly-detectors', environment: 'production', agentName: 'go' })
        .instance('instance-prod');

      const detectorsEvents = range
        .interval('1m')
        .rate(baselineRate)
        .generator((timestamp) => {
          if (isAnomalous(timestamp)) {
            // CRITICAL failure rate (~95% fail) + only a MINOR latency bump
            // (150ms -> 250ms) so failure rate clearly out-scores latency.
            const fail = Math.random() < 0.95;
            const tx = detectorsInstance
              .transaction({ transactionName: TRANSACTION_NAME })
              .timestamp(timestamp)
              .duration(250);
            return fail ? tx.failure() : tx.success();
          }
          // Baseline: fast + mostly successful (~3% fail).
          const fail = Math.random() < 0.03;
          const tx = detectorsInstance
            .transaction({ transactionName: TRANSACTION_NAME })
            .timestamp(timestamp)
            .duration(150);
          return fail ? tx.failure() : tx.success();
        });

      // 2) Same service in two environments with different latency severities.
      //    Trips detector 0 high_mean(transaction_latency): CRITICAL in prod,
      //    MINOR in dev, so the "all environments" badge must surface prod.
      const envProdInstance = apm
        .service({ name: 'synth-anomaly-environments', environment: 'production', agentName: 'go' })
        .instance('instance-prod');
      const envDevInstance = apm
        .service({
          name: 'synth-anomaly-environments',
          environment: 'development',
          agentName: 'go',
        })
        .instance('instance-dev');

      const envProdEvents = range
        .interval('1m')
        .rate(baselineRate)
        .generator((timestamp) =>
          envProdInstance
            .transaction({ transactionName: TRANSACTION_NAME })
            .timestamp(timestamp)
            // CRITICAL latency spike in the anomaly window.
            .duration(isAnomalous(timestamp) ? 6000 : 150)
            .success()
        );

      const envDevEvents = range
        .interval('1m')
        .rate(baselineRate)
        .generator((timestamp) =>
          envDevInstance
            .transaction({ transactionName: TRANSACTION_NAME })
            .timestamp(timestamp)
            // Only a MINOR latency bump in the anomaly window.
            .duration(isAnomalous(timestamp) ? 300 : 150)
            .success()
        );

      // 3) Throughput anomaly (large spike) on a dedicated service. Trips
      //    detector 1 mean(transaction_throughput) with a ~20x burst.
      const throughputInstance = apm
        .service({ name: 'synth-anomaly-throughput', environment: 'production', agentName: 'go' })
        .instance('instance-prod');

      const throughputEvents = range
        .interval('1m')
        .rate(baselineRate)
        .generator((timestamp) => {
          const burst = isAnomalous(timestamp) ? 20 : 1;
          return Array.from({ length: burst }, () =>
            throughputInstance
              .transaction({ transactionName: TRANSACTION_NAME })
              .timestamp(timestamp)
              .duration(150)
              .success()
          );
        });

      return withClient(apmEsClient, [
        detectorsEvents,
        envProdEvents,
        envDevEvents,
        throughputEvents,
      ]);
    },
  };
};

export default scenario;
