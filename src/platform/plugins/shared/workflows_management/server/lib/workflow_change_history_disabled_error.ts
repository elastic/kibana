/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Thrown when workflow version history reads are requested while change-history
 * is not initialized.
 */
export const WORKFLOW_CHANGE_HISTORY_UNAVAILABLE_MESSAGE =
  'Workflow version history is not available.';

export class WorkflowChangeHistoryDisabledError extends Error {
  constructor(message = WORKFLOW_CHANGE_HISTORY_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = 'WorkflowChangeHistoryDisabledError';
  }
}
