/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput } from '@kbn/workflows';

/**
 * Map of workflow IDs to workflow details
 * Used for quick lookup of workflow names by ID
 */
export interface WorkflowsMap {
  [workflowId: string]: {
    id: string;
    name: string;
    inputs?: WorkflowInput[];
  };
}

/**
 * Response from the workflows search API
 * Used for pre-loading workflows into Redux store
 */
export interface WorkflowsResponse {
  workflows: WorkflowsMap;
  totalWorkflows: number;
}
