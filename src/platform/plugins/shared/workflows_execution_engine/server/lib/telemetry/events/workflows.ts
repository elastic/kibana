/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@kbn/core/server';

export enum WorkflowsExecutionEventTypes {
  /**
   * When a workflow execution starts
   */
  WorkflowExecutionStarted = 'workflows_execution_started',
}

export const workflowExecutionEventNames = {
  [WorkflowsExecutionEventTypes.WorkflowExecutionStarted]: 'Workflow execution started',
} as const;

export const WORKFLOWS_EXECUTION_STARTED: EventTypeOpts<{
  workflowId: string;
  workflowExecutionId: string;
  eventName: string;
}> = {
  eventType: WorkflowsExecutionEventTypes.WorkflowExecutionStarted,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    workflowId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the workflow',
        optional: false,
      },
    },
    workflowExecutionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the workflow execution',
        optional: false,
      },
    },
  },
};
