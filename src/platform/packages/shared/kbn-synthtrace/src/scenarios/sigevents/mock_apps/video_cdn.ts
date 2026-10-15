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

// Video-streaming CDN delivery pipeline:
//   edge-cache → origin-shield / manifest-service / drm-license / analytics-collector
//   origin-shield → transcoder
//   manifest-service → transcoder
// Error pools deliberately include security-flavoured lines (DRM/token abuse, hotlinking,
// stolen license, anti-piracy block, geo-restriction bypass) so query generation produces
// high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'edge-cache',
    runtime: 'go',
    infraDeps: ['redis', 'kafka'],
    version: '5.1.0',
    deployment: { k8s: { namespace: 'edge' } },
    serviceLogs: {
      success: ['Segment served from edge', 'Cache HIT for media segment', 'Edge node warmed'],
      error: [
        'Hotlinking detected: referer mismatch on signed segment URL, blocking delivery',
        'Token abuse detected: replayed playback token from anomalous IP range',
        'Cache fill failed: origin-shield unreachable, serving stale segment',
      ],
    },
  } as const,
  {
    name: 'origin-shield',
    runtime: 'go',
    infraDeps: ['redis', 'postgres'],
    version: '4.3.2',
    deployment: { k8s: { namespace: 'origin' } },
    serviceLogs: {
      success: ['Origin fetch completed', 'Shield cache populated', 'Range request fulfilled'],
      error: [
        'Origin fetch failed: upstream transcoder returned 502',
        'Shield cache persistence failed: redis under memory pressure',
      ],
    },
  } as const,
  {
    name: 'manifest-service',
    runtime: 'node',
    infraDeps: ['postgres', 'redis'],
    version: '2.7.1',
    deployment: { k8s: { namespace: 'manifest' } },
    serviceLogs: {
      success: ['Manifest generated', 'HLS playlist served', 'Variant ladder assembled'],
      error: [
        'Geo-restriction bypass attempt: spoofed region header on manifest request',
        'Manifest build failed: catalog lookup timed out against primary datastore',
        'Variant resolution failed: missing rendition for requested bitrate',
      ],
    },
  } as const,
  {
    name: 'transcoder',
    runtime: 'java',
    infraDeps: ['kafka', 'postgres'],
    version: '6.0.4',
    deployment: { k8s: { namespace: 'transcode' } },
    serviceLogs: {
      success: ['Rendition encoded', 'Transcode job committed', 'Segment packaged'],
      error: [
        'Transcode job aborted: encoder worker exceeded memory budget',
        'Job dispatch failed: unable to publish to Kafka transcode queue after retries',
        'Packaging failed: source mezzanine asset corrupt or truncated',
      ],
    },
  } as const,
  {
    name: 'drm-license',
    runtime: 'python',
    infraDeps: ['postgres', 'redis'],
    version: '3.4.0',
    deployment: { k8s: { namespace: 'drm' } },
    serviceLogs: {
      success: ['License issued', 'Key request authorized', 'Entitlement verified'],
      error: [
        'Stolen license key reuse detected: revoking device and flagging account for anti-piracy',
        'Anti-piracy block enforced: device fingerprint matched known circumvention tool',
        'License issuance failed: entitlement datastore connection timeout',
        'DRM key exchange rejected: playback token signature verification failed',
      ],
    },
  } as const,
  {
    name: 'analytics-collector',
    runtime: 'node',
    infraDeps: ['kafka', 'elasticsearch'],
    version: '1.8.3',
    deployment: { k8s: { namespace: 'analytics' } },
    serviceLogs: {
      success: ['Playback event ingested', 'QoE metric recorded', 'Heartbeat batch flushed'],
      error: [
        'Event ingestion stalled: Kafka playback-events topic unavailable',
        'Analytics write failed: elasticsearch bulk request rejected under load',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'edge-cache', target: 'origin-shield', protocol: 'http' },
  { source: 'edge-cache', target: 'manifest-service', protocol: 'http' },
  { source: 'edge-cache', target: 'drm-license', protocol: 'grpc' },
  { source: 'edge-cache', target: 'analytics-collector', protocol: 'kafka' },
  { source: 'origin-shield', target: 'transcoder', protocol: 'http' },
  { source: 'manifest-service', target: 'transcoder', protocol: 'grpc' },
] satisfies ServiceEdge[];

const VIDEO_CDN_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const VIDEO_CDN_APP = defineMockApp({
  serviceGraph: VIDEO_CDN_GRAPH,
  entryService: 'edge-cache',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // redis thundering-herd cache stampede at 65% for 6 min; edge-cache and origin-shield degrade.
    redis_cache_stampede: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: hot-key expiry causes a synchronized refill burst.
          phase('0m', '2m', {
            failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.25 } } },
            volume: { 'edge-cache': { scale: 2 }, redis: { scale: 4 } },
            noise: { scale: 3 },
          }),
          phase('2m', '6m', {
            failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.65 } } },
            volume: {
              'edge-cache': { scale: 4 },
              'origin-shield': { scale: 3 },
              redis: { scale: 6 },
            },
            noise: { scale: 4 },
          }),
        ]);
      },
    },

    // postgres entitlement datastore times out at 80% for 5 min; cascades to drm-license, manifest, origin-shield.
    catalog_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: {
            'drm-license': { scale: 2 },
            'manifest-service': { scale: 2 },
            postgres: { scale: 4 },
          },
          noise: { scale: 2 },
        });
      },
    },

    // kafka transcode/playback event stream outage at 70% for 6 min; transcoder and analytics-collector stall.
    kafka_stream_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: {
            transcoder: { scale: 2 },
            'analytics-collector': { scale: 2 },
            kafka: { scale: 4 },
          },
          noise: { scale: 3 },
        });
      },
    },

    // drm-license gateway times out at 70%; 2-min warn ramp precedes full incident; cascades to edge-cache.
    drm_license_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: key-server latency rising, circuit breaker threshold approaching.
          phase('0m', '2m', {
            failures: { services: { 'drm-license': { errorType: 'gateway_timeout', rate: 0.2 } } },
            volume: { 'edge-cache': { scale: 1.5 }, 'drm-license': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: { services: { 'drm-license': { errorType: 'gateway_timeout', rate: 0.7 } } },
            volume: { 'edge-cache': { scale: 1.5 }, 'drm-license': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // Three-stage transcoder meltdown: postgres timeout → transcoder OOM-kill → CrashLoopBackOff; clean recovery after.
    transcoder_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          // Stage 1: postgres times out → transcoder job lookups retry.
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { transcoder: { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: retry backlog peaks → transcoder OOM-killed.
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { transcoder: { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { transcoder: { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → transcoder crash-loops.
          phase('6m', '9m', {
            failures: {
              services: {
                transcoder: { errorType: 'k8s_crash_loop_backoff', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { transcoder: { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Live-event traffic surge: edge-cache 5× burst, manifest-service times out under load; piracy/abuse noise as red herrings.
    live_event_surge: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'manifest-service': { errorType: 'gateway_timeout', rate: 0.5 } },
            },
            volume: {
              'edge-cache': { scale: 5 },
              'manifest-service': { scale: 3 },
              'analytics-collector': { scale: 3 },
            },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message: 'WAF blocked suspected stream-ripping botnet hammering manifest endpoint',
              rate: 0.4,
            },
            {
              message: 'Rate limiter tripped: anomalous playback-token request volume per IP',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
