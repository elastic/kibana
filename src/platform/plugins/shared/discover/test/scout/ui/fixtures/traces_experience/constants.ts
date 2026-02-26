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
    'src/platform/plugins/shared/discover/test/scout/ui/fixtures/traces_experience/kbn_archives/traces_data_view.json',
};

export const RICH_TRACE = {
  TRANSACTION_NAME: 'GET /checkout',
  DB_SPAN_NAME: 'SELECT * FROM orders',
  INTERNAL_SPAN_NAME: 'Process order item',
  ERRORS: {
    TRANSACTION_DB_ERROR: 'Constraint violation: duplicate key',
    TRANSACTION_VALIDATION_ERROR: 'Validation error: invalid order ID',
    DB_SPAN_TIMEOUT: 'Query timeout on orders table',
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
};

export const PRODUCER_TRACE = {
  TRANSACTION_NAME: 'Background job',
};
