/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Seed documents. `traces-apm-*` and `metrics-apm-*` have no explicit mapping:
 * Elasticsearch maps them on first ingest.
 */

export const tracesApmIndexRequest: IndexRequest = {
  index: 'traces-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    event: { outcome: 'success' },
    transaction: {
      duration: { us: 1000 },
      id: '945254c567a5417e',
    },
    service: { name: 'my-service' },
  },
};

export const metricsApmIndexRequest: IndexRequest = {
  index: 'metrics-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    metricset: {
      name: 'transaction',
      interval: '1m',
    },
    transaction: {
      duration: { us: 13980 },
    },
  },
};

const LOGS = 'logs-production.evaluations.2025.01.01';
// Recent timestamps, so queries an agent runs to explore (`NOW() - 1 hour`) return rows.
const now = new Date().toISOString();

/**
 * A few realistic rows, so an agent can discover field values (for example
 * `event.action: "logon-failed"`) instead of guessing them.
 */
const sampleDocuments: ReadonlyArray<[string, Record<string, unknown>]> = [
  [
    LOGS,
    {
      event: { action: 'logon-failed', code: 4625 },
      user: { name: 'alice' },
      host: { name: 'web-01' },
      source: { ip: '10.0.0.5' },
    },
  ],
  [
    LOGS,
    {
      event: { action: 'logon-success', code: 4624 },
      user: { name: 'bob' },
      host: { name: 'web-02' },
    },
  ],
  [
    LOGS,
    {
      process: { name: 'curl.exe' },
      source: { bytes: 52_000 },
      network: { bytes: 61_000, direction: 'outbound' },
      destination: { address: 'files.example.org', ip: '203.0.113.7', port: 443 },
      user: { name: 'alice' },
      host: { name: 'web-01' },
    },
  ],
  [
    LOGS,
    {
      dns: { question: { name: 'cdn.example.org', registered_domain: 'example.org' } },
      host: { name: 'web-02' },
    },
  ],
  [LOGS, { error_code: 'E1001', log: { message: 'upstream timeout' }, host: { name: 'web-01' } }],
  [LOGS, { system: { cpu: { total: { norm: { pct: 0.93 } } } }, host: { name: 'db-01' } }],
  [
    'metricbeat-production.evaluations-2025.01.01',
    {
      system: { cpu: { user: { pct: 0.7 }, system: { pct: 0.3 }, cores: 4 } },
      host: { name: 'db-01' },
    },
  ],
  [
    'postgres-logs-production.evaluations.2025.01.01',
    { message: 'LOG:  duration: 12.5 ms  statement: SELECT * FROM orders' },
  ],
  [
    'employees-production.evaluations.2025.01.01',
    { emp_no: '10001', hire_date: '2019-09-15', salary: 52_000 },
  ],
];

export const esqlFixtureDocumentRequests: readonly IndexRequest[] = [
  tracesApmIndexRequest,
  metricsApmIndexRequest,
  // Fixed ids keep the seed idempotent: every Playwright worker runs setup.
  ...sampleDocuments.map(([index, document], i) => ({
    index,
    id: `sample-${i}`,
    document: { '@timestamp': now, ...document },
  })),
];
