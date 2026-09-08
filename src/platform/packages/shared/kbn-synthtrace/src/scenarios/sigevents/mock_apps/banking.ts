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

// Retail-banking ledger pipeline:
//   api-gateway → account-service / ledger-core
//   ledger-core → transaction-processor → fraud-monitor / notification-service
// Error pools deliberately include security-flavoured lines (fraudulent transfer,
// unauthorized account access, AML/sanctions flags, credential abuse) so query
// generation produces high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'api-gateway',
    runtime: 'node',
    infraDeps: ['redis', 'kafka'],
    version: '5.1.0',
    deployment: { k8s: { namespace: 'edge' } },
    serviceLogs: {
      success: ['Request routed', 'Session validated', 'JWT verified'],
      error: [
        'Unauthorized account access attempt: bearer token failed signature verification',
        'Credential abuse detected: repeated failed logins from single client, possible brute force',
        'Failed to route request: upstream account service unavailable',
      ],
    },
  } as const,
  {
    name: 'account-service',
    runtime: 'java',
    infraDeps: ['postgres', 'redis'],
    version: '4.3.2',
    deployment: { k8s: { namespace: 'accounts' } },
    serviceLogs: {
      success: ['Account balance retrieved', 'Profile updated', 'Account opened'],
      error: [
        'Unauthorized account access: caller lacks ownership of requested account',
        'Account lookup failed: primary datastore connection timeout',
        'Session cache miss under memory pressure: redis eviction during balance fetch',
      ],
    },
  } as const,
  {
    name: 'ledger-core',
    runtime: 'go',
    infraDeps: ['postgres', 'kafka'],
    version: '3.7.0',
    deployment: { k8s: { namespace: 'ledger' } },
    serviceLogs: {
      success: ['Ledger entry posted', 'Double-entry balanced', 'Journal committed'],
      error: [
        'Ledger posting failed: database transaction rolled back after timeout',
        'Double-entry reconciliation mismatch: debit and credit totals diverge',
        'Event publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
  {
    name: 'transaction-processor',
    runtime: 'java',
    infraDeps: ['postgres', 'kafka'],
    version: '4.0.1',
    deployment: { k8s: { namespace: 'transactions' } },
    serviceLogs: {
      success: ['Transfer settled', 'Payment cleared', 'Standing order executed'],
      error: [
        'Fraudulent transfer blocked: destination account on internal watchlist',
        'Transfer authorization failed: insufficient funds after hold release',
        'Settlement aborted: downstream ledger transaction timed out',
      ],
    },
  } as const,
  {
    name: 'fraud-monitor',
    runtime: 'python',
    infraDeps: ['elasticsearch', 'redis'],
    version: '2.6.3',
    deployment: { k8s: { namespace: 'fraud' } },
    serviceLogs: {
      success: ['Transaction scored', 'Risk model evaluated', 'Watchlist checked'],
      error: [
        'AML sanctions match flagged: counterparty hit OFAC screening list, transfer held',
        'Suspicious activity report triggered: structuring pattern across linked accounts',
        'Fraud scoring failed: search backend unreachable during watchlist lookup',
      ],
    },
  } as const,
  {
    name: 'notification-service',
    runtime: 'node',
    infraDeps: ['kafka', 'mongodb'],
    version: '1.8.5',
    deployment: { k8s: { namespace: 'notifications' } },
    serviceLogs: {
      success: ['Alert dispatched', 'Statement emailed', 'Push notification sent'],
      error: [
        'Notification dispatch failed: provider gateway returned 502',
        'Event consume failed: Kafka consumer lag on topic ledger-events',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'api-gateway', target: 'account-service', protocol: 'http' },
  { source: 'api-gateway', target: 'ledger-core', protocol: 'http' },
  { source: 'ledger-core', target: 'transaction-processor', protocol: 'grpc' },
  { source: 'transaction-processor', target: 'fraud-monitor', protocol: 'http' },
  { source: 'transaction-processor', target: 'notification-service', protocol: 'kafka' },
  { source: 'fraud-monitor', target: 'notification-service', protocol: 'kafka' },
] satisfies ServiceEdge[];

const BANKING_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const BANKING_APP = defineMockApp({
  serviceGraph: BANKING_GRAPH,
  entryService: 'api-gateway',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // postgres times out at 80% for 5 min; ledger-core, account-service and transaction-processor degrade.
    ledger_postgres_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'ledger-core': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // transaction-processor gateway-times out at 70%; 2-min warn ramp; cascades to ledger-core.
    transaction_processor_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: settlement latency rising, circuit breaker threshold approaching.
          phase('0m', '2m', {
            failures: {
              services: { 'transaction-processor': { errorType: 'gateway_timeout', rate: 0.2 } },
            },
            volume: { 'ledger-core': { scale: 1.5 }, 'transaction-processor': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: {
              services: { 'transaction-processor': { errorType: 'gateway_timeout', rate: 0.7 } },
            },
            volume: { 'ledger-core': { scale: 1.5 }, 'transaction-processor': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // redis evicts session/cache hot keys at 60% for 5 min; api-gateway and account-service degrade.
    session_cache_eviction: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.6 } } },
          volume: { 'account-service': { scale: 3 }, redis: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // kafka broker outage at 70% for 6 min; ledger event publish and notification-service stall.
    kafka_broker_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: { 'notification-service': { scale: 2 }, kafka: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // Three-stage ledger meltdown: postgres timeout → ledger-core OOM → CrashLoopBackOff; clean recovery after.
    ledger_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          // Stage 1: postgres times out → callers retry.
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'ledger-core': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: retry backlog peaks → ledger-core OOM-killed.
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { 'ledger-core': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { 'ledger-core': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → ledger-core crash-loops.
          phase('6m', '9m', {
            failures: {
              services: {
                'ledger-core': { errorType: 'k8s_crash_loop_backoff', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { 'ledger-core': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Payday traffic surge: api-gateway/transaction-processor 5× burst, fraud-monitor times out under load; credential-abuse noise.
    payday_surge: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'fraud-monitor': { errorType: 'gateway_timeout', rate: 0.5 } },
            },
            volume: {
              'api-gateway': { scale: 5 },
              'transaction-processor': { scale: 5 },
              'fraud-monitor': { scale: 3 },
            },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message: 'WAF blocked suspected credential-stuffing burst targeting login endpoint',
              rate: 0.4,
            },
            {
              message: 'Rate limiter tripped: anomalous transfer-initiation volume per account',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
