/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceEdge, ServiceGraph, ServiceNode } from '../../../lib/service_graph_logs/types';
import { defineMockApp } from '../utils';

// Ride-hailing dispatch pipeline:
//   rider-gateway → driver-gateway / matching-engine / pricing-service
//   matching-engine → trip-service / geo-tracker
//   trip-service → geo-tracker
// Error pools deliberately include security-flavoured lines (account takeover, GPS
// spoofing, payment fraud, fake driver onboarding) so query generation produces
// high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'rider-gateway',
    runtime: 'node',
    infraDeps: ['redis', 'kafka'],
    version: '5.1.0',
    deployment: { k8s: { namespace: 'rider' } },
    serviceLogs: {
      success: ['Ride requested', 'Rider session established', 'Trip estimate returned'],
      error: [
        'Account takeover suspected: ride requested from impossible-travel location',
        'Suspicious request rate from single rider account: possible credential stuffing',
        'Failed to request ride: upstream matching service unavailable',
      ],
    },
  } as const,
  {
    name: 'driver-gateway',
    runtime: 'go',
    infraDeps: ['redis', 'postgres'],
    version: '4.3.2',
    deployment: { k8s: { namespace: 'driver' } },
    serviceLogs: {
      success: ['Driver online', 'Driver heartbeat received', 'Dispatch offer delivered'],
      error: [
        'Fake driver onboarding detected: forged license document rejected and account flagged',
        'Driver availability write failed: redis cache eviction under memory pressure',
        'Dispatch offer delivery failed: driver session expired',
      ],
    },
  } as const,
  {
    name: 'matching-engine',
    runtime: 'java',
    infraDeps: ['redis', 'kafka'],
    version: '3.7.1',
    deployment: { k8s: { namespace: 'matching' } },
    serviceLogs: {
      success: ['Match found', 'Driver assigned to trip', 'Dispatch decision committed'],
      error: [
        'Matching aborted: no eligible drivers within dispatch radius',
        'Match state read failed: redis cluster connection timeout',
        'Dispatch event publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
  {
    name: 'pricing-service',
    runtime: 'python',
    infraDeps: ['postgres', 'elasticsearch'],
    version: '2.4.0',
    deployment: { k8s: { namespace: 'pricing' } },
    serviceLogs: {
      success: ['Fare quoted', 'Surge multiplier applied', 'Promo code validated'],
      error: [
        'Payment fraud signal detected: stolen card pattern on fare authorization, declining and flagging account',
        'Surge computation failed: pricing model read timeout from primary datastore',
        'Promo abuse detected: same device redeeming new-rider promo repeatedly',
      ],
    },
  } as const,
  {
    name: 'trip-service',
    runtime: 'go',
    infraDeps: ['postgres', 'kafka'],
    version: '3.0.5',
    deployment: { k8s: { namespace: 'trip' } },
    serviceLogs: {
      success: ['Trip started', 'Trip state persisted', 'Trip completed'],
      error: [
        'Trip persistence failed: database transaction rolled back after timeout',
        'Trip event publish failed: Kafka topic trip-events unavailable',
      ],
    },
  } as const,
  {
    name: 'geo-tracker',
    runtime: 'go',
    infraDeps: ['redis', 'mongodb'],
    version: '2.2.3',
    deployment: { k8s: { namespace: 'geo' } },
    serviceLogs: {
      success: ['Location update ingested', 'ETA recalculated', 'Geofence event emitted'],
      error: [
        'GPS spoofing detected: location jump exceeds physical speed limit, ignoring update',
        'Location write failed: redis geo index eviction under memory pressure',
        'Telemetry read failed: mongodb primary connection timeout',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'rider-gateway', target: 'driver-gateway', protocol: 'http' },
  { source: 'rider-gateway', target: 'matching-engine', protocol: 'http' },
  { source: 'rider-gateway', target: 'pricing-service', protocol: 'http' },
  { source: 'matching-engine', target: 'trip-service', protocol: 'grpc' },
  { source: 'matching-engine', target: 'geo-tracker', protocol: 'grpc' },
  { source: 'trip-service', target: 'geo-tracker', protocol: 'kafka' },
] satisfies ServiceEdge[];

const RIDE_HAILING_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const RIDE_HAILING_APP = defineMockApp({
  serviceGraph: RIDE_HAILING_GRAPH,
  entryService: 'rider-gateway',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // matching-engine gateway-times out at 70% for 5 min; 2-min warn ramp; cascades to rider-gateway.
    matching_engine_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          phase('0m', '2m', {
            failures: {
              services: { 'matching-engine': { errorType: 'gateway_timeout', rate: 0.2 } },
            },
            volume: { 'rider-gateway': { scale: 1.5 }, 'matching-engine': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: {
              services: { 'matching-engine': { errorType: 'gateway_timeout', rate: 0.7 } },
            },
            volume: { 'rider-gateway': { scale: 1.5 }, 'matching-engine': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // redis evicts hot geo/match keys at 60% for 5 min; geo-tracker, matching-engine and driver-gateway degrade.
    redis_geo_eviction: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.6 } } },
          volume: {
            'geo-tracker': { scale: 3 },
            'matching-engine': { scale: 2 },
            redis: { scale: 4 },
          },
          noise: { scale: 3 },
        });
      },
    },

    // postgres times out at 80% for 5 min; cascades to trip-service, pricing-service and driver-gateway.
    trip_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'trip-service': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // kafka broker outage at 70% for 6 min; dispatch and trip event publish stall.
    kafka_dispatch_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: {
            'trip-service': { scale: 2 },
            'matching-engine': { scale: 2 },
            kafka: { scale: 4 },
          },
          noise: { scale: 3 },
        });
      },
    },

    // Three-stage trip meltdown: postgres timeout → trip-service OOM → CrashLoopBackOff.
    trip_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'trip-service': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { 'trip-service': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { 'trip-service': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          phase('6m', '9m', {
            failures: {
              services: {
                'trip-service': { errorType: 'k8s_crash_loop_backoff', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { 'trip-service': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Surge-pricing storm: rider-gateway/matching-engine 5× burst, pricing-service times out under load; payment-fraud noise.
    surge_pricing_storm: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'pricing-service': { errorType: 'gateway_timeout', rate: 0.5 } },
            },
            volume: {
              'rider-gateway': { scale: 5 },
              'matching-engine': { scale: 5 },
              'pricing-service': { scale: 3 },
            },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message:
                'Fraud engine flagged spike in stolen-card fare authorizations from botnet range',
              rate: 0.4,
            },
            {
              message: 'Rate limiter tripped: anomalous ride-request volume per device fingerprint',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
