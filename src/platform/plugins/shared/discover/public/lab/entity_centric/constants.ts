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

export const FAKE_LOG_ENTRIES: readonly FakeLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-05-07T09:42:11.302Z',
    level: 'INFO',
    serviceName: 'orders-api',
    message: 'POST /api/v1/orders 201 created in 84ms',
  },
  {
    id: 'log-2',
    timestamp: '2026-05-07T09:42:11.987Z',
    level: 'WARN',
    serviceName: 'payments-worker',
    message: 'Retrying charge for tx_8821 (attempt 2/5)',
  },
  {
    id: 'log-3',
    timestamp: '2026-05-07T09:42:12.114Z',
    level: 'ERROR',
    serviceName: 'inventory-svc',
    message: 'ConnectionTimeout: upstream stock-db unreachable after 5000ms',
  },
  {
    id: 'log-4',
    timestamp: '2026-05-07T09:42:12.530Z',
    level: 'INFO',
    serviceName: 'orders-api',
    message: 'GET /api/v1/orders/42 200 served from cache',
  },
  {
    id: 'log-5',
    timestamp: '2026-05-07T09:42:13.001Z',
    level: 'DEBUG',
    serviceName: 'auth-gateway',
    message: 'Issued JWT for user_id=4711, scopes=[orders:read]',
  },
  {
    id: 'log-6',
    timestamp: '2026-05-07T09:42:13.488Z',
    level: 'INFO',
    serviceName: 'shipping-tracker',
    message: 'Shipment SHP-9912 transitioned to OUT_FOR_DELIVERY',
  },
  {
    id: 'log-7',
    timestamp: '2026-05-07T09:42:13.902Z',
    level: 'WARN',
    serviceName: 'payments-worker',
    message: 'Slow downstream call: stripe.charges.create took 1.2s',
  },
  {
    id: 'log-8',
    timestamp: '2026-05-07T09:42:14.337Z',
    level: 'INFO',
    serviceName: 'auth-gateway',
    message: '12 active sessions refreshed',
  },
  {
    id: 'log-9',
    timestamp: '2026-05-07T09:42:14.812Z',
    level: 'ERROR',
    serviceName: 'orders-api',
    message: 'Unhandled rejection in /api/v1/orders/checkout: ValidationError',
  },
  {
    id: 'log-10',
    timestamp: '2026-05-07T09:42:15.220Z',
    level: 'INFO',
    serviceName: 'inventory-svc',
    message: 'Restored connection to stock-db (3 pending writes flushed)',
  },
];
