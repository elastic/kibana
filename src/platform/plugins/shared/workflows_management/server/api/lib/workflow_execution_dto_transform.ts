/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';

type WorkflowExecutionVersionSource = Pick<EsWorkflowExecution, 'version'>;

/**
 * Maps the workflow document version captured at execution start onto API DTOs.
 * Omits the field when absent or non-numeric (legacy executions).
 */
export const mapWorkflowExecutionDocumentVersion = (
  source: WorkflowExecutionVersionSource
): { version?: number } => {
  const { version } = source;
  if (typeof version === 'number' && !Number.isNaN(version)) {
    return { version };
  }
  return {};
};
