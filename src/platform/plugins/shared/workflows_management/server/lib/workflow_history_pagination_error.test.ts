/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ES_MAX_RESULT_WINDOW,
  WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE,
  WorkflowHistoryPaginationError,
} from './workflow_history_pagination_error';

describe('WorkflowHistoryPaginationError', () => {
  it('exposes the Elasticsearch max result window constant', () => {
    expect(ES_MAX_RESULT_WINDOW).toBe(10_000);
  });

  it('uses the shared exceeded-pagination message by default', () => {
    const error = new WorkflowHistoryPaginationError();

    expect(error.message).toBe(WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE);
    expect(error.name).toBe('WorkflowHistoryPaginationError');
  });

  it('accepts a custom message', () => {
    const error = new WorkflowHistoryPaginationError('custom pagination error');

    expect(error.message).toBe('custom pagination error');
  });
});
