/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TRACES = {
  DEFAULT_START_TIME: '2025-01-01T00:00:00.000Z',
  DEFAULT_END_TIME: '2025-01-01T00:01:00.000Z',
  ESQL_QUERY: 'FROM traces-apm*',
  DATA_VIEW_NAME: 'traces-apm*',
  KBN_ARCHIVE:
    'src/platform/plugins/shared/discover/test/scout/traces_experience/ui/fixtures/kbn_archives/traces_data_view.json',
};

export const RICH_TRACE = {
  SERVICE_NAME: 'synth-traces-frontend',
  TRANSACTION_NAME: 'GET /checkout',
  DB_SPAN_NAME: 'SELECT * FROM orders',
  INTERNAL_SPAN_NAME: 'Process order item',
  ERRORS: {
    TRANSACTION_DB_ERROR: 'Constraint violation: duplicate key',
    TRANSACTION_VALIDATION_ERROR: 'Validation error: invalid order ID',
    DB_SPAN_TIMEOUT: 'Query timeout on orders table',
    PROCESS_ORDER_FAILURE: 'Order processing failed: item out of stock',
  },
  LOGS: {
    TRANSACTION_DB_ERROR: 'Constraint violation: duplicate key value violates unique constraint',
    TRANSACTION_VALIDATION_ERROR: 'Validation error: order ID format is invalid',
    TRANSACTION_INFO: 'Checkout process initiated for order #1234',
    DB_SPAN_TIMEOUT: 'Query timeout on orders table after 30s',
    PROCESS_ORDER_VALIDATING: 'Processing order item: validating payment details',
    PROCESS_ORDER_INVENTORY: 'Order item inventory check passed',
    PROCESS_ORDER_SUCCESS: 'Order item processed successfully',
  },
};

export const MINIMAL_TRACE = {
  TRANSACTION_NAME: 'GET /health',
  LOGS: {
    HEALTH_CHECK_START: 'Health check started',
    HEALTH_CHECK_SUCCESS: 'Health check passed',
  },
};

export const DEEP_TRACE = {
  TRANSACTION_NAME: 'GET /scroll-test',
  SCROLL_TARGET_SPAN_NAME: 'scroll-target-span',
};

export const PRODUCER_TRACE = {
  SERVICE_NAME: 'synth-traces-backend',
  TRANSACTION_NAME: 'Background job',
  KAFKA_SPAN_NAME: 'Publish to kafka/orders',
};

/**
 * The latency map fixture's service, named after the Scout run: the fixture shares the APM
 * streams with every other run against the same cluster, and the run id (set once by the
 * Scout config, before the global setup) keeps each run's spans, query and teardown to
 * itself.
 */
const LATENCY_SERVICE_NAME = `synth-traces-latency-${process.env.TEST_RUN_ID ?? 'local'}`;

export const LATENCY_TRACE = {
  SERVICE_NAME: LATENCY_SERVICE_NAME,
  TRANSACTION_NAME: 'GET /latency',
  /** A second operation whose durations fall into two clear groups, for the bands. */
  TRANSACTION_NAME_MIXED: 'GET /latency-mixed',
  ESQL_QUERY: `FROM traces-apm* | WHERE service.name == "${LATENCY_SERVICE_NAME}"`,
};

export const OTEL_SERVICE = {
  SERVICE_NAME: 'synth-traces-otel',
  NAMESPACE: 'production',
  ESQL_QUERY: 'FROM traces-test.otel-*',
};
