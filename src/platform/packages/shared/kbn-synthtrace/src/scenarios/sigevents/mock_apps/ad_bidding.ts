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

// Real-time ad bidding (RTB) pipeline:
//   bid-gateway → auction-engine / targeting-service
//   auction-engine → budget-pacer / creative-service / impression-tracker
// Error pools deliberately include security-flavoured lines (click fraud, bot /
// invalid traffic, bid manipulation, malicious creative / malvertising,
// budget-drain attacks) so query generation produces high-severity
// (security-class) queries.
const SERVICES = [
  {
    name: 'bid-gateway',
    runtime: 'go',
    infraDeps: ['redis', 'kafka'],
    version: '5.1.0',
    deployment: { k8s: { namespace: 'rtb-edge' } },
    serviceLogs: {
      success: ['Bid request accepted', 'Bid response returned', 'Bidstream event published'],
      error: [
        'Invalid traffic detected: bot-driven bid requests from datacenter range, rejecting',
        'Bid manipulation suspected: malformed bid request signature, dropping connection',
        'Bid request rejected: upstream auction-engine unavailable past deadline',
      ],
    },
  } as const,
  {
    name: 'auction-engine',
    runtime: 'go',
    infraDeps: ['redis', 'kafka'],
    version: '4.3.2',
    deployment: { k8s: { namespace: 'rtb-auction' } },
    serviceLogs: {
      success: ['Auction cleared', 'Winning bid selected', 'Second-price computed'],
      error: [
        'Auction aborted: bid-cache read timeout, no eligible bids resolved',
        'Auction skipped: no eligible campaigns after pacing and targeting filters',
        'Unhandled error in auction pipeline: clearing aborted',
      ],
    },
  } as const,
  {
    name: 'budget-pacer',
    runtime: 'java',
    infraDeps: ['postgres', 'redis'],
    version: '3.0.4',
    deployment: { k8s: { namespace: 'rtb-pacing' } },
    serviceLogs: {
      success: ['Budget pacing updated', 'Spend reservation committed', 'Campaign cap evaluated'],
      error: [
        'Budget-drain attack suspected: anomalous spend velocity on campaign, freezing budget',
        'Spend reservation failed: campaign budget ledger transaction rolled back after timeout',
        'Pacing recompute failed: stale budget snapshot, falling back to conservative cap',
      ],
    },
  } as const,
  {
    name: 'targeting-service',
    runtime: 'python',
    infraDeps: ['elasticsearch', 'redis'],
    version: '2.7.1',
    deployment: { k8s: { namespace: 'rtb-targeting' } },
    serviceLogs: {
      success: ['Audience segments matched', 'Targeting filters applied', 'Eligibility resolved'],
      error: [
        'Targeting query failed: segment index unreachable, returning empty audience',
        'Audience lookup timeout: analytics cluster slow to respond under load',
      ],
    },
  } as const,
  {
    name: 'creative-service',
    runtime: 'node',
    infraDeps: ['mongodb', 'redis'],
    version: '1.8.3',
    deployment: { k8s: { namespace: 'rtb-creative' } },
    serviceLogs: {
      success: ['Creative selected', 'Creative markup rendered', 'Asset cache hit'],
      error: [
        'Malicious creative blocked: malvertising payload flagged by scanner, quarantining asset',
        'Creative fetch failed: asset store connection timeout, serving fallback creative',
      ],
    },
  } as const,
  {
    name: 'impression-tracker',
    runtime: 'go',
    infraDeps: ['kafka', 'mongodb'],
    version: '2.2.0',
    deployment: { k8s: { namespace: 'rtb-tracking' } },
    serviceLogs: {
      success: ['Impression recorded', 'Win notice processed', 'Tracking event published'],
      error: [
        'Click fraud detected: impossible click-through latency, discarding event and flagging source',
        'Impression event publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'bid-gateway', target: 'auction-engine', protocol: 'grpc' },
  { source: 'bid-gateway', target: 'targeting-service', protocol: 'http' },
  { source: 'auction-engine', target: 'budget-pacer', protocol: 'grpc' },
  { source: 'auction-engine', target: 'creative-service', protocol: 'http' },
  { source: 'auction-engine', target: 'impression-tracker', protocol: 'kafka' },
  { source: 'impression-tracker', target: 'budget-pacer', protocol: 'kafka' },
] satisfies ServiceEdge[];

const AD_BIDDING_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const AD_BIDDING_APP = defineMockApp({
  serviceGraph: AD_BIDDING_GRAPH,
  entryService: 'bid-gateway',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // redis bid-cache latency spike at 65% for 5 min; auction-engine and bid-gateway miss deadlines.
    bid_cache_latency_spike: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.65 } } },
          volume: { 'auction-engine': { scale: 3 }, redis: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // budget-pacer postgres ledger times out at 80% for 5 min; cascades to auction-engine and impression-tracker.
    budget_ledger_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'budget-pacer': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // kafka bidstream broker outage at 70% for 6 min; impression-tracker and auction-engine event publish stall.
    bidstream_kafka_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: { 'impression-tracker': { scale: 2 }, kafka: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // auction-engine gateway times out at 70% for 5 min; 2-min warn ramp; cascades to bid-gateway.
    auction_engine_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: bid-cache round-trips rising, auction deadline budget shrinking.
          phase('0m', '2m', {
            failures: {
              services: { 'auction-engine': { errorType: 'gateway_timeout', rate: 0.2 } },
            },
            volume: { 'bid-gateway': { scale: 1.5 }, 'auction-engine': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: {
              services: { 'auction-engine': { errorType: 'gateway_timeout', rate: 0.7 } },
            },
            volume: { 'bid-gateway': { scale: 1.5 }, 'auction-engine': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // Three-stage budget-pacer meltdown: postgres ledger timeout → budget-pacer OOM → CrashLoopBackOff.
    budget_pacer_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          // Stage 1: budget ledger times out → callers retry pacing lookups.
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'budget-pacer': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: retry backlog peaks → budget-pacer OOM-killed.
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { 'budget-pacer': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { 'budget-pacer': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → budget-pacer crash-loops.
          phase('6m', '9m', {
            failures: {
              services: {
                'budget-pacer': { errorType: 'k8s_crash_loop_backoff', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { 'budget-pacer': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Traffic-fraud surge: bid-gateway 5× burst, impression-tracker internal errors under load; invalid-traffic / click-fraud noise.
    invalid_traffic_surge: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'impression-tracker': { errorType: 'internal_error', rate: 0.5 } },
            },
            volume: { 'bid-gateway': { scale: 5 }, 'impression-tracker': { scale: 3 } },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message: 'Fraud filter flagged coordinated bot bidstream from datacenter ASN',
              rate: 0.4,
            },
            {
              message: 'Anomaly detector tripped: impossible click-through rate on creative set',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
