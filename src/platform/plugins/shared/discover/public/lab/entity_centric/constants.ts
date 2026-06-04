/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ENTITY_CENTRIC_LAB_SETTING = 'discover:entityCentricLab' as const;

export type FakeLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface FakeLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly level: FakeLogLevel;
  readonly serviceName: string;
  readonly message: string;
}

/**
 * PayFlow incident storyline (Apr 14, 2026 — 02:46:41 → 02:47:31):
 * Sofia opens Discover, scans these six lines, and clicks the service name
 * (`payments-service` or `checkout-service`) to start her four-hop
 * investigation. The other entities mentioned in the message body
 * (`stripe-api`, `payments-pod-7f9b2`, `node-prod-eu-04`, …) are intentionally
 * left as plain text — they are reachable only via the Dependencies tab of
 * the click-path flyouts.
 *
 * When chaos mode is OFF (Sofia rolled back v2.14.3) the panel swaps in
 * {@link FAKE_LOG_ENTRIES_RECOVERY} instead — the same six entities
 * but on the healthy side of the rollback, so the lab matches the
 * recovered state of the flyout / entity list.
 */
export const FAKE_LOG_ENTRIES: readonly FakeLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-04-14T02:46:41.012Z',
    level: 'INFO',
    serviceName: 'payments-service',
    message: 'Deployment completed v2.14.3',
  },
  {
    id: 'log-2',
    timestamp: '2026-04-14T02:46:58.421Z',
    level: 'WARN',
    serviceName: 'payments-service',
    message: 'Memory usage at 97% of limit (pod payments-pod-7f9b2)',
  },
  {
    id: 'log-3',
    timestamp: '2026-04-14T02:47:09.084Z',
    level: 'ERROR',
    serviceName: 'payments-service',
    message: 'OOMKilled — container payments-pod-7f9b2 restarting (3 restarts in last 5 min)',
  },
  {
    id: 'log-4',
    timestamp: '2026-04-14T02:47:21.604Z',
    level: 'ERROR',
    serviceName: 'payments-service',
    message: 'Timeout connecting to stripe-api after 5000ms',
  },
  {
    id: 'log-5',
    timestamp: '2026-04-14T02:47:28.612Z',
    level: 'ERROR',
    serviceName: 'checkout-service',
    message: 'POST /checkout/confirm 503 upstream error 812ms',
  },
  {
    id: 'log-6',
    timestamp: '2026-04-14T02:47:31.842Z',
    level: 'ERROR',
    serviceName: 'checkout-service',
    message: 'POST /checkout/confirm 503 upstream error 841ms — error rate above 5%',
  },
];

/**
 * PayFlow recovery feed — surfaced when chaos mode is OFF.
 * Same six services and pod / node references as {@link FAKE_LOG_ENTRIES}
 * so the visual diff between the two states is purely "everything's
 * red" → "everything's green". Timestamps advance ~10 minutes past
 * the rollback so the recovery narrative reads as the latest activity
 * (Sofia ran the rollback, watched the dashboards, and these are the
 * follow-up logs confirming the stack came back to healthy).
 */
export const FAKE_LOG_ENTRIES_RECOVERY: readonly FakeLogEntry[] = [
  {
    id: 'log-recovery-1',
    timestamp: '2026-04-14T02:57:14.018Z',
    level: 'INFO',
    serviceName: 'payments-service',
    message: 'Rollback to v2.14.2 complete — pod payments-pod-7f9b2 ready (1/1)',
  },
  {
    id: 'log-recovery-2',
    timestamp: '2026-04-14T02:57:26.402Z',
    level: 'INFO',
    serviceName: 'payments-service',
    message: 'Memory usage at 41% of limit (pod payments-pod-7f9b2) — no restarts in last 10 min',
  },
  {
    id: 'log-recovery-3',
    timestamp: '2026-04-14T02:57:38.171Z',
    level: 'INFO',
    serviceName: 'payments-service',
    message: 'stripe-api responding within SLO (median 238ms, p95 412ms)',
  },
  {
    id: 'log-recovery-4',
    timestamp: '2026-04-14T02:57:49.044Z',
    level: 'INFO',
    serviceName: 'payments-service',
    message: 'P95 latency back within target (181ms over last 5 min)',
  },
  {
    id: 'log-recovery-5',
    timestamp: '2026-04-14T02:58:02.519Z',
    level: 'INFO',
    serviceName: 'checkout-service',
    message: 'POST /checkout/confirm 200 — error rate 0.04% (below 0.5% threshold)',
  },
  {
    id: 'log-recovery-6',
    timestamp: '2026-04-14T02:58:14.987Z',
    level: 'INFO',
    serviceName: 'checkout-service',
    message: 'Healthcheck passing on all 4 replicas — node-prod-eu-04 reporting Ready',
  },
];
