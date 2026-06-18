/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionListItemDto } from '@kbn/workflows';

/** Clipboard / copy action: pretty-printed JSON for one or more execution list items. */
export const formatWorkflowExecutionsForCopy = (
  executions: WorkflowExecutionListItemDto[]
): string => {
  if (executions.length === 1) {
    return JSON.stringify(executions[0], null, 2);
  }

  return JSON.stringify(executions, null, 2);
};
