/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-item result of a bulk workflow schedule call. The array is order- and
 * length-preserving with respect to the input items: `results[i]` corresponds
 * to `items[i]`.
 */
export type BulkScheduleWorkflowResult = Array<
  | { status: 'scheduled'; workflowExecutionId: string }
  | { status: 'error'; error: { message: string; code?: string } }
>;
