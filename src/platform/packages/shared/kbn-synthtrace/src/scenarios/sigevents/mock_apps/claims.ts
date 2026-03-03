/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sigEvents } from '../../../lib/service_graph_logs';
import { defineMockApp } from '../utils';

// Insurance claims processing pipeline (claim-intake → policy-lookup / fraud-check → payment-processor → notification-dispatch).
export const CLAIMS_APP = defineMockApp({
  serviceGraph: sigEvents.DEFAULT_SERVICE_GRAPH,
  entryService: 'claim-intake',
  scenarios: {
    // All services are healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // postgres times out at 80% rate for 5 min, cascading to callers; recovers cleanly.
    postgres_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'claim-intake': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // postgres (80% timeout) and fraud-check (70% internal error) fail simultaneously for 6 min; recovers cleanly.
    multi_failure: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: {
            infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
            services: { 'fraud-check': { errorType: 'internal_error', rate: 0.7 } },
          },
          volume: { 'claim-intake': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 4 },
        });
      },
    },

    // policy-lookup pods enter CrashLoopBackOff; 2-min warn ramp (rate 0.2) precedes a 5-min crash-loop (rate 0.95); cascades synchronously to claim-intake.
    k8s_crashloop: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: liveness probe misses and restart count climb before full crash-loop.
          phase('0m', '2m', {
            failures: {
              services: { 'policy-lookup': { errorType: 'k8s_crash_loop_back', rate: 0.2 } },
            },
            volume: { 'claim-intake': { scale: 2 }, 'policy-lookup': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: {
              services: { 'policy-lookup': { errorType: 'k8s_crash_loop_back', rate: 0.95 } },
            },
            volume: { 'claim-intake': { scale: 2 }, 'policy-lookup': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // claim-intake and fraud-check are high-traffic hubs (5× DFS burst); policy-lookup and notification-dispatch are sparse leaf services.
    volume_skew: {
      build() {
        return {
          volume: {
            'claim-intake': { spikes: [{ scale: 5 }] },
            'policy-lookup': { every: 10 },
            'notification-dispatch': { every: 20 },
          },
          noise: { volume: { rate: 3 } },
        };
      },
    },

    // fraud-check gateway times out at 70% rate; 2-min warn ramp (rate 0.2) precedes full incident for 5 min; cascades synchronously to claim-intake.
    fraud_check_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: upstream latency rising, circuit breaker threshold approaching.
          phase('0m', '2m', {
            failures: { services: { 'fraud-check': { errorType: 'gateway_timeout', rate: 0.2 } } },
            volume: { 'claim-intake': { scale: 1.5 }, 'fraud-check': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: { services: { 'fraud-check': { errorType: 'gateway_timeout', rate: 0.7 } } },
            volume: { 'claim-intake': { scale: 1.5 }, 'fraud-check': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // fraud-check times out at 70% rate for 5 min; misleading Redis and Kafka noise fire throughout as red herrings.
    fraud_check_redis_herring: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '5m', {
            failures: { services: { 'fraud-check': { errorType: 'gateway_timeout', rate: 0.7 } } },
            volume: { 'claim-intake': { scale: 2 }, 'fraud-check': { scale: 4 } },
            noise: { scale: 4 },
          }),
          ghostMentions: [
            { message: 'Redis connection timeout after 5000ms', rate: 0.4 },
            { message: 'Kafka consumer lag detected on topic claim-events', rate: 0.2 },
          ],
        };
      },
    },

    // Three-stage escalation: postgres DB timeout (+0 to +2 min), claim-intake OOM-kill (+2 to +5 min), CrashLoopBackOff (+5 to +8 min); clean recovery after.
    db_oom_crashloop: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Stage 1: postgres times out → callers retry.
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'claim-intake': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: retry backlog peaks → claim-intake OOM-killed.
          phase('2m', '5m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { 'claim-intake': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { 'claim-intake': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → claim-intake crash-loops.
          phase('5m', '8m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: {
                'claim-intake': { errorType: 'k8s_crash_loop_back', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { 'claim-intake': { scale: 2 }, postgres: { scale: 4 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },
  },
});
