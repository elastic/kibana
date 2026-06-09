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
 * multi-environment anomaly badge behaviour. Every service exists in MULTIPLE
 * ENVIRONMENTS (production + development), and each environment is anomalous at a
 * DIFFERENT time, so the "all environments" combined chart shows two distinct
 * anomaly clusters (each tagged with its environment in the tooltip):
 *
 *   1. Highest score ACROSS DETECTORS (latency vs throughput vs failure rate):
 *      `synth-anomaly-detectors` (production) gets a CRITICAL failure-rate
 *      anomaly together with only a MINOR latency bump in the same window. The
 *      badge must show the failure-rate (critical) score, not the latency one.
 *
 *   2. Highest score ACROSS ENVIRONMENTS (when env selector = "all"):
 *      every service has a CRITICAL anomaly in `production` (earlier sub-window)
 *      and a smaller MAJOR anomaly in `development` (later sub-window). Both
 *      render in the combined chart at different times, but the badge / open
 *      anomalies link must still surface the production (highest) score.
 *
 *   3. Detector coverage across environments:
 *      a dedicated service trips each detector (latency, throughput, failure
 *      rate) in both environments, critical in prod and major in dev.
 *
 * ANOMALY WINDOWS
 * ---------------
 * The trailing `anomalyWindowHours` span is split into two non-overlapping
 * sub-windows so the two environments spike at different times:
 *   - production  -> earlier half of the span
 *   - development -> later half of the span (through the end of the range)
 * Everything before the span is flat baseline so ML can learn a normal model.
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
 * Detector -> service/environment mapping engineered below (critical in prod,
 * major in dev, at different times):
 *   - detector 2 (failure rate) + detector 0 (latency, minor)
 *       -> synth-anomaly-detectors / production (critical FR) + development (major FR)
 *   - detector 0 (latency)
 *       -> synth-anomaly-environments / production (critical) + development (major)
 *   - detector 1 (throughput)
 *       -> synth-anomaly-throughput / production (critical) + development (major)
 *
 * DATA SHAPE
 * ----------
 * - Type: APM transactions (traces-apm and metrics-apm indices).
 *   transaction.type=request so it matches the detectors above. The ML jobs read
 *   the aggregated transaction metrics (metrics-apm*), which synthtrace produces
 *   automatically via its transaction-metrics aggregators.
 * - A long flat BASELINE over the whole range lets ML learn a normal model, then
 *   two short ANOMALY SUB-WINDOWS at the end (default: last 2h split in half)
 *   inject the per-environment deviations.
 *
 * RUNNING (IMPORTANT: do NOT use --live)
 * --------------------------------------
 * This scenario relies on a historical baseline followed by trailing spikes, so
 * it must be ingested over a fixed past range. In `--live` mode every generated
 * bucket is in the anomaly window (anomalyStart is fixed at process start), so
 * there is no baseline and the elevated values are flat -> ML learns them as
 * "normal" and never flags an anomaly. Always run a fixed window, e.g.:
 *
 *   node scripts/synthtrace apm_anomalies --from=now-7d --to=now --clean
 *
 * A wider baseline (e.g. --from=now-7d) gives ML more normal history and makes
 * the trailing spikes stand out more. Note that a 1-hour range with the default
 * 2h anomaly window leaves no baseline; pick a range wider than the window.
 *
 * SCENARIO OPTS
 * -------------
 * --scenarioOpts.anomalyWindowHours=2   Trailing hours that are anomalous
 *                                       (split in half across the two envs).
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

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const TRANSACTION_NAME = 'GET /api/orders';

const PRODUCTION = 'production';
const DEVELOPMENT = 'development';

const BASELINE_DURATION = 150;
const BASELINE_FAIL_PROBABILITY = 0.03;

const DEFAULT_SCENARIO_OPTS = {
  anomalyWindowHours: 2,
  // 10 tx/min gives the transaction-metrics aggregations enough samples per
  // bucket for ML to build a stable baseline (2/min is too sparse and noisy).
  baselineRate: 10,
};

type AnomalyPredicate = (timestamp: number) => boolean;

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { anomalyWindowHours, baselineRate } = {
    ...DEFAULT_SCENARIO_OPTS,
    ...(runOptions.scenarioOpts || {}),
  };

  // Split the trailing anomaly span into two non-overlapping sub-windows so each
  // environment is anomalous at a DIFFERENT time. Production takes the earlier
  // half, development the later half (open-ended so it reaches the range end).
  // `--to now` means the range end is ~Date.now(), so anchoring off `now` keeps
  // the anomalous buckets inside whatever range the caller passes.
  const now = Date.now();
  const totalWindowMs = Number(anomalyWindowHours) * 60 * 60 * 1000;
  const productionWindowStart = now - totalWindowMs;
  const developmentWindowStart = now - totalWindowMs / 2;

  const isProductionAnomaly: AnomalyPredicate = (timestamp) =>
    timestamp >= productionWindowStart && timestamp < developmentWindowStart;
  const isDevelopmentAnomaly: AnomalyPredicate = (timestamp) => timestamp >= developmentWindowStart;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instanceFor = (name: string, environment: string) =>
        apm.service({ name, environment, agentName: 'go' }).instance(`instance-${environment}`);

      // Latency detector (index 0, high_mean). The anomaly window raises the
      // transaction duration; pass a critical (large) or major (smaller) spike.
      const latencyEvents = (
        instance: Instance,
        isAnomalous: AnomalyPredicate,
        anomalyDuration: number
      ) =>
        range
          .interval('1m')
          .rate(baselineRate)
          .generator((timestamp) =>
            instance
              .transaction({ transactionName: TRANSACTION_NAME })
              .timestamp(timestamp)
              .duration(isAnomalous(timestamp) ? anomalyDuration : BASELINE_DURATION)
              .success()
          );

      // Failure-rate detector (index 2, high_mean). The anomaly window raises
      // the share of failed transactions; `anomalyDuration` lets the same
      // service also nudge the latency detector (kept minor on purpose).
      const failureEvents = (
        instance: Instance,
        isAnomalous: AnomalyPredicate,
        {
          anomalyFailProbability,
          anomalyDuration,
        }: { anomalyFailProbability: number; anomalyDuration: number }
      ) =>
        range
          .interval('1m')
          .rate(baselineRate)
          .generator((timestamp) => {
            const inAnomaly = isAnomalous(timestamp);
            const failProbability = inAnomaly ? anomalyFailProbability : BASELINE_FAIL_PROBABILITY;
            const duration = inAnomaly ? anomalyDuration : BASELINE_DURATION;
            const tx = instance
              .transaction({ transactionName: TRANSACTION_NAME })
              .timestamp(timestamp)
              .duration(duration);
            return Math.random() < failProbability ? tx.failure() : tx.success();
          });

      // Throughput detector (index 1, mean). The anomaly window multiplies the
      // number of transactions per bucket by `anomalyBurst`.
      const throughputEvents = (
        instance: Instance,
        isAnomalous: AnomalyPredicate,
        anomalyBurst: number
      ) =>
        range
          .interval('1m')
          .rate(baselineRate)
          .generator((timestamp) => {
            const burst = isAnomalous(timestamp) ? anomalyBurst : 1;
            return Array.from({ length: burst }, () =>
              instance
                .transaction({ transactionName: TRANSACTION_NAME })
                .timestamp(timestamp)
                .duration(BASELINE_DURATION)
                .success()
            );
          });

      // 1) Multiple detectors, multiple environments at different times.
      //    Production trips detector 2 high_mean(failed_transaction_rate) hard
      //    (~95% fail) plus detector 0 high_mean(transaction_latency) lightly
      //    (150ms -> 250ms), so its surfaced score comes from failure rate.
      //    Development gets a MAJOR failure-rate anomaly (~70% fail) in the later
      //    sub-window so both render at different times, prod still highest.
      const detectorsEvents = [
        failureEvents(instanceFor('synth-anomaly-detectors', PRODUCTION), isProductionAnomaly, {
          anomalyFailProbability: 0.95,
          anomalyDuration: 250,
        }),
        failureEvents(instanceFor('synth-anomaly-detectors', DEVELOPMENT), isDevelopmentAnomaly, {
          anomalyFailProbability: 0.7,
          anomalyDuration: BASELINE_DURATION,
        }),
      ];

      // 2) Latency anomaly across environments at different times. CRITICAL
      //    latency spike in production (earlier), MAJOR bump in development
      //    (later).
      const environmentsEvents = [
        latencyEvents(
          instanceFor('synth-anomaly-environments', PRODUCTION),
          isProductionAnomaly,
          6000
        ),
        latencyEvents(
          instanceFor('synth-anomaly-environments', DEVELOPMENT),
          isDevelopmentAnomaly,
          1500
        ),
      ];

      // 3) Throughput anomaly across environments at different times. A ~20x
      //    burst (CRITICAL) in production (earlier) and a ~8x burst (MAJOR) in
      //    development (later).
      const throughputEventsByEnv = [
        throughputEvents(
          instanceFor('synth-anomaly-throughput', PRODUCTION),
          isProductionAnomaly,
          20
        ),
        throughputEvents(
          instanceFor('synth-anomaly-throughput', DEVELOPMENT),
          isDevelopmentAnomaly,
          8
        ),
      ];

      return withClient(apmEsClient, [
        ...detectorsEvents,
        ...environmentsEvents,
        ...throughputEventsByEnv,
      ]);
    },
  };
};

export default scenario;
