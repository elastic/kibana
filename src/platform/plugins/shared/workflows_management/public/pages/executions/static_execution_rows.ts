/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface WorkflowExecutionListStubRow {
  readonly '@timestamp': string;
  readonly execution_id: string;
  readonly workflow_name: string;
  readonly status: string;
  readonly trigger_type: string;
}

export const WORKFLOW_EXECUTIONS_STUB_DATA_VIEW_TITLE = 'workflows-executions-stub';

export const STATIC_WORKFLOW_EXECUTION_ROWS: WorkflowExecutionListStubRow[] = [
  {
    '@timestamp': '2026-05-01T10:15:00.000Z',
    execution_id: 'exec-001',
    workflow_name: 'Notify on-call',
    status: 'completed',
    trigger_type: 'manual',
  },
  {
    '@timestamp': '2026-05-01T10:42:22.000Z',
    execution_id: 'exec-002',
    workflow_name: 'Index enrichment',
    status: 'running',
    trigger_type: 'index',
  },
  {
    '@timestamp': '2026-05-02T08:03:11.000Z',
    execution_id: 'exec-003',
    workflow_name: 'Weekly report',
    status: 'failed',
    trigger_type: 'alert',
  },
];
