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
 * Seed documents for `traces-apm-*` and `metrics-apm-*`. Elasticsearch maps
 * these indices dynamically on first ingest, so one document makes the
 * wildcard resolve and gives ES|QL real columns to check against.
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

export const esqlFixtureDocumentRequests: readonly IndexRequest[] = [
  tracesApmIndexRequest,
  metricsApmIndexRequest,
];
