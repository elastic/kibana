/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sigEvents } from '../../../lib/sigevents';
import { defineMockApp, duration } from '../utils';

export const CLAIMS_APP = defineMockApp({
  name: 'Claims Pipeline',
  description:
    'Insurance claims processing pipeline (claim-intake → policy-lookup / fraud-check → payment-processor → notification-dispatch).',
  serviceGraph: sigEvents.DEFAULT_SERVICE_GRAPH,
  entryService: 'claim-intake',
  scenarios: {
    healthy_baseline: {
      name: 'Healthy Baseline',
      description: 'All services are healthy.',
      build() {
        return {};
      },
    },
    db_timeout: {
      name: 'PostgreSQL DB Timeout',
      description:
        'postgres times out at 80% rate for 5 min, cascading to callers; recovers cleanly.',
      build({ at }) {
        return {
          failures: (ts: number) =>
            ts >= at(0) && ts < at(5)
              ? { infra: { postgres: { errorType: 'db_timeout' as const, rate: 0.8 } } }
              : undefined,
          volume: {
            'claim-intake': {
              spikes: [{ start: at(0), end: duration('5m'), multiplier: 2 }],
            },
            postgres: {
              rate: 1,
              spikes: [{ start: at(0), end: duration('5m'), multiplier: 4 }],
            },
          },
          noise: {
            volume: { spikes: [{ start: at(0), end: duration('5m'), multiplier: 2 }] },
          },
        };
      },
    },

    multi_failure: {
      name: 'Multi-System Failure',
      description:
        'postgres (80% timeout) and fraud-check (70% internal error) fail simultaneously for 10 min; recovers cleanly.',
      build({ at }) {
        return {
          failures: (ts: number) =>
            ts >= at(0) && ts < at(10)
              ? {
                  infra: { postgres: { errorType: 'db_timeout' as const, rate: 0.8 } },
                  services: { 'fraud-check': { errorType: 'internal_error' as const, rate: 0.7 } },
                }
              : undefined,
          volume: {
            'claim-intake': {
              spikes: [{ start: at(0), end: duration('10m'), multiplier: 2 }],
            },
            postgres: {
              rate: 1,
              spikes: [{ start: at(0), end: duration('10m'), multiplier: 4 }],
            },
          },
          noise: {
            volume: { spikes: [{ start: at(0), end: duration('10m'), multiplier: 4 }] },
          },
        };
      },
    },

    k8s_crash_loop_back: {
      name: 'Kubernetes CrashLoopBackOff',
      description:
        'policy-lookup pods enter CrashLoopBackOff; 2-min warn ramp (rate 0.2) precedes the full 10-min crash-loop (rate 0.95); cascades synchronously to claim-intake.',
      build({ at }) {
        return {
          failures: (ts: number) => {
            if (ts >= at(0) && ts < at(2)) {
              // Warn ramp: liveness probe misses and restart count climb before full crash-loop.
              return {
                services: {
                  'policy-lookup': { errorType: 'k8s_crash_loop_back' as const, rate: 0.2 },
                },
              };
            }
            if (ts >= at(2) && ts < at(12)) {
              return {
                services: {
                  'policy-lookup': { errorType: 'k8s_crash_loop_back' as const, rate: 0.95 },
                },
              };
            }
            return undefined;
          },
          volume: {
            'claim-intake': {
              spikes: [{ start: at(0), end: duration('12m'), multiplier: 2 }],
            },
            'policy-lookup': {
              spikes: [{ start: at(0), end: duration('12m'), multiplier: 3 }],
            },
          },
          noise: {
            volume: { spikes: [{ start: at(0), end: duration('12m'), multiplier: 3 }] },
          },
        };
      },
    },

    volume_skew: {
      name: 'Volume Skew',
      description:
        'claim-intake and fraud-check are high-traffic hubs (5× DFS burst); policy-lookup and notification-dispatch are sparse leaf services.',
      build() {
        return {
          volume: {
            'claim-intake': { spikes: [{ multiplier: 5 }] },
            'policy-lookup': { every: 10 },
            'notification-dispatch': { every: 20 },
          },
          noise: { volume: { rate: 3 } },
        };
      },
    },

    cascading_payment: {
      name: 'Cascading Fraud-Check Gateway Timeout',
      description:
        'fraud-check gateway times out at 70% rate; 2-min warn ramp (rate 0.2) precedes full incident; cascades synchronously to claim-intake.',
      build({ at }) {
        return {
          failures: (ts: number) => {
            if (ts >= at(0) && ts < at(2)) {
              // Warn ramp: upstream latency rising, circuit breaker threshold approaching.
              return {
                services: { 'fraud-check': { errorType: 'gateway_timeout' as const, rate: 0.2 } },
              };
            }
            if (ts >= at(2)) {
              return {
                services: { 'fraud-check': { errorType: 'gateway_timeout' as const, rate: 0.7 } },
              };
            }
            return undefined;
          },
          volume: {
            'claim-intake': { spikes: [{ start: at(0), multiplier: 1.5 }] },
            'fraud-check': { spikes: [{ start: at(0), multiplier: 3 }] },
          },
          noise: { volume: { spikes: [{ start: at(0), multiplier: 3 }] } },
        };
      },
    },

    db_oom_crashloop: {
      name: 'DB Timeout → OOM → CrashLoopBackOff',
      description:
        'Three-stage escalation: postgres DB timeout (stage 1), claim-intake OOM-kill (stage 2), CrashLoopBackOff (stage 3); clean recovery after.',
      build({ at }) {
        return {
          failures: (ts: number) => {
            // Stage 3 (+10 to +20 min): kubelet backoff → claim-intake crash-loops.
            if (ts >= at(10) && ts < at(20)) {
              return {
                infra: { postgres: { errorType: 'db_timeout' as const, rate: 0.8 } },
                services: {
                  'claim-intake': {
                    errorType: 'k8s_crash_loop_back' as const,
                    rate: 0.95,
                    multiplier: 5,
                  },
                },
              };
            }
            // Stage 2 (+5 to +10 min): retry backlog peaks → claim-intake OOM-killed.
            if (ts >= at(5) && ts < at(10)) {
              return {
                infra: { postgres: { errorType: 'db_timeout' as const, rate: 0.8 } },
                services: {
                  'claim-intake': { errorType: 'k8s_oom' as const, rate: 0.6, multiplier: 4 },
                },
              };
            }
            // Stage 1 (+0 to +5 min): postgres times out → callers retry.
            if (ts >= at(0) && ts < at(5)) {
              return { infra: { postgres: { errorType: 'db_timeout' as const, rate: 0.8 } } };
            }
            return undefined;
          },
          volume: {
            'claim-intake': {
              spikes: [
                { start: at(0), end: duration('5m'), multiplier: 3 },
                { start: at(5), end: duration('5m'), multiplier: 10 },
                { start: at(10), end: duration('10m'), multiplier: 2 },
              ],
            },
            postgres: {
              rate: 1,
              spikes: [{ start: at(0), end: duration('20m'), multiplier: 4 }],
            },
          },
          noise: {
            volume: {
              spikes: [
                { start: at(0), end: duration('5m'), multiplier: 3 },
                { start: at(5), end: duration('5m'), multiplier: 10 },
                { start: at(10), end: duration('10m'), multiplier: 6 },
              ],
            },
          },
        };
      },
    },
  },
});
