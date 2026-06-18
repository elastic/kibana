/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowChangeHistoryAction } from '../../../../common/lib/workflow_change_history/constants';
import type {
  WorkflowChangesHistoryResponse,
  WorkflowHistoryItem,
} from '../../../../common/lib/workflow_change_history/types';

export const SAMPLE_WORKFLOW_ID = 'workflow-1';

export const sampleWorkflowHistoryItems: WorkflowHistoryItem[] = [
  {
    id: 'evt-current',
    timestamp: '2026-06-16T12:00:00.000Z',
    user: { id: 'user-1', name: 'Alice' },
    action: WorkflowChangeHistoryAction.workflowUpdate,
    version: 3,
    workflow: { yaml: 'name: current\n' },
  },
  {
    id: 'evt-previous',
    timestamp: '2026-06-15T12:00:00.000Z',
    user: null,
    action: WorkflowChangeHistoryAction.workflowCreate,
    version: 1,
    workflow: { yaml: 'name: original\n' },
  },
];

export const sampleWorkflowHistoryResponse: WorkflowChangesHistoryResponse = {
  page: 1,
  perPage: 20,
  total: sampleWorkflowHistoryItems.length,
  items: sampleWorkflowHistoryItems,
};
