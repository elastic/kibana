/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOW_RUN_TASK_TYPE = 'workflow:run';

export const WORKFLOW_RESUME_TASK_TYPE = 'workflow:resume';

export const WORKFLOW_SCHEDULED_TASK_TYPE = 'workflow:scheduled';

/**
 * Recurring task that migrates terminal workflow & step executions from the mutable
 * execution state index into the append-only execution history data streams.
 */
export const WORKFLOW_MIGRATION_TASK_TYPE = 'workflow:migrate-executions';

/** Stable, well-known id for the singleton recurring migration task. */
export const WORKFLOW_MIGRATION_TASK_ID = 'workflow:migrate-executions';

export interface StartWorkflowExecutionParams {
  workflowRunId: string;
  spaceId: string;
  index?: string;
}

export interface ResumeWorkflowExecutionParams {
  workflowRunId: string;
  spaceId: string;
  index?: string;
}
