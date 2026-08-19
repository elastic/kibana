/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Elasticsearch default `index.max_result_window` for from/size pagination. */
export const ES_MAX_RESULT_WINDOW = 10_000;

export const WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE = `Workflow history pagination exceeds the maximum result window of ${ES_MAX_RESULT_WINDOW} entries.`;

/**
 * Thrown when workflow history pagination would exceed Elasticsearch's max result window.
 */
export class WorkflowHistoryPaginationError extends Error {
  constructor(message = WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE) {
    super(message);
    this.name = 'WorkflowHistoryPaginationError';
  }
}
