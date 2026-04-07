/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/server';
import type { WellKnownWorkflowTriggerSource } from '@kbn/workflows';
import {
  type EventDrivenExecutionSuppressedParams,
  type WorkflowExecutionCancelledParams,
  type WorkflowExecutionCompletedParams,
  type WorkflowExecutionFailedParams,
  WorkflowExecutionTelemetryEventTypes,
} from './types';

export const workflowExecutionEventNames = {
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted]: 'Workflow execution completed',
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed]: 'Workflow execution failed',
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled]: 'Workflow execution cancelled',
  [WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed]:
    'Event-driven workflow execution suppressed at runtime',
};

const baseWorkflowExecutionSchema: RootSchema<{
  workflowExecutionId: string;
  workflowId: string;
  spaceId: string;
  triggerType: WellKnownWorkflowTriggerSource | 'event';
  eventTriggerId?: string;
  isTestRun: boolean;
  ruleId?: string;
  compositionDepth?: number;
  parentWorkflowId?: string;
  parentWorkflowInvocation?: 'sync' | 'async';
  eventChainDepth?: number;
}> = {
  workflowExecutionId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow execution ID',
      optional: false,
    },
  },
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID',
      optional: false,
    },
  },
  spaceId: {
    type: 'keyword',
    _meta: {
      description: 'The space ID',
      optional: false,
    },
  },
  triggerType: {
    type: 'keyword',
    _meta: {
      description:
        'How the workflow was triggered: manual, scheduled, alert, workflow-step (sub-workflow), or event (event-driven trigger)',
      optional: false,
    },
  },
  eventTriggerId: {
    type: 'keyword',
    _meta: {
      description:
        'Event trigger id when triggerType is event (e.g. cases.caseCreated). Omitted for built-in triggers.',
      optional: true,
    },
  },
  isTestRun: {
    type: 'boolean',
    _meta: {
      description: 'Whether this is a test run',
      optional: false,
    },
  },
  ruleId: {
    type: 'keyword',
    _meta: {
      description:
        'The alert rule ID if triggered by alert. Only present when triggerType is alert.',
      optional: true,
    },
  },
  compositionDepth: {
    type: 'integer',
    _meta: {
      description:
        'Cross-workflow nesting depth for sub-workflow executions (1 = direct child). Only present for sub-workflow executions.',
      optional: true,
    },
  },
  parentWorkflowId: {
    type: 'keyword',
    _meta: {
      description:
        'The workflow ID of the parent workflow that invoked this sub-workflow. Only present for sub-workflow executions.',
      optional: true,
    },
  },
  parentWorkflowInvocation: {
    type: 'keyword',
    _meta: {
      description:
        'Whether the parent started this sub-workflow with workflow.execute (sync) or workflow.executeAsync (async). Only present for sub-workflow executions.',
      optional: true,
    },
  },
  eventChainDepth: {
    type: 'integer',
    _meta: {
      description:
        'Event-chain depth when this run was scheduled from event-driven emits. Distinct from compositionDepth.',
      optional: true,
    },
  },
};

const {
  compositionDepth: _compositionDepth,
  parentWorkflowId: _parentWorkflowId,
  parentWorkflowInvocation: _parentWorkflowInvocation,
  ...eventDrivenExecutionSuppressedBaseSchema
} = baseWorkflowExecutionSchema;

const eventNameSchema: RootSchema<{ eventName: string }> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
};

const workflowExecutionCompletedSchema: RootSchema<WorkflowExecutionCompletedParams> = {
  ...baseWorkflowExecutionSchema,
  ...eventNameSchema,
  startedAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution started (ISO string)',
      optional: false,
    },
  },
  completedAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution completed (ISO string)',
      optional: false,
    },
  },
  duration: {
    type: 'long',
    _meta: {
      description: 'Total execution duration in milliseconds',
      optional: false,
    },
  },
  timeToFirstStep: {
    type: 'long',
    _meta: {
      description:
        'Time to first step (TTFS) in milliseconds - time from start to first step execution',
      optional: true,
    },
  },
  stepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps in the workflow',
      optional: false,
    },
  },
  stepTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Step type',
      },
    },
    _meta: {
      description: 'Array of step types in the workflow',
      optional: false,
    },
  },
  connectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type',
      },
    },
    _meta: {
      description: 'Array of connector types used in the workflow',
      optional: false,
    },
  },
  hasScheduledTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has scheduled triggers',
      optional: false,
    },
  },
  hasAlertTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has alert triggers',
      optional: false,
    },
  },
  hasTimeout: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has timeout configured',
      optional: false,
    },
  },
  hasConcurrency: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has concurrency configured',
      optional: false,
    },
  },
  hasOnFailure: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has on-failure handlers',
      optional: false,
    },
  },
  executedStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that were executed',
      optional: false,
    },
  },
  successfulStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that completed successfully',
      optional: false,
    },
  },
  failedStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that failed',
      optional: false,
    },
  },
  skippedStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that were skipped',
      optional: false,
    },
  },
  executedConnectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type that was used',
      },
    },
    _meta: {
      description: 'Array of connector types that were actually used in execution',
      optional: false,
    },
  },
  maxExecutionDepth: {
    type: 'integer',
    _meta: {
      description: 'Maximum execution depth (nested scopes)',
      optional: false,
    },
  },
  hasRetries: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps were retried',
      optional: false,
    },
  },
  hasErrorHandling: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps used on-failure handlers (fallback, continue)',
      optional: false,
    },
  },
  uniqueStepIdsExecuted: {
    type: 'integer',
    _meta: {
      description: 'Number of unique step IDs that were executed (accounts for loops/retries)',
      optional: false,
    },
  },
  queueDelayMs: {
    type: 'long',
    _meta: {
      description:
        'Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing. Only present when workflow was queued due to concurrency limits or scheduling.',
      optional: true,
    },
  },
  emitToStartMs: {
    type: 'long',
    _meta: {
      description:
        'Time from event dispatch to workflow execution start in milliseconds. Only present for event-driven executions when dispatch metadata is available.',
      optional: true,
    },
  },
  timedOut: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow execution timed out',
      optional: false,
    },
  },
  timeoutMs: {
    type: 'long',
    _meta: {
      description: 'Configured timeout in milliseconds. Only present when timeout is configured.',
      optional: true,
    },
  },
  timeoutExceededByMs: {
    type: 'long',
    _meta: {
      description:
        'How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.',
      optional: true,
    },
  },
  stepDurations: {
    type: 'array',
    items: {
      type: 'pass_through',
      _meta: {
        description: 'Step duration entry with stepId, stepType (optional), and duration',
      },
    },
    _meta: {
      description:
        'Array of step durations with step identification. Only includes steps that have completed (have both startedAt and finishedAt).',
      optional: true,
    },
  },
  stepAvgDurationsByType: {
    type: 'pass_through',
    _meta: {
      description:
        'Average duration per step type (dictionary with sanitized step type as key). Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing. E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }',
      optional: true,
    },
  },
};

const workflowExecutionFailedSchema: RootSchema<WorkflowExecutionFailedParams> = {
  ...baseWorkflowExecutionSchema,
  ...eventNameSchema,
  startedAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution started (ISO string)',
      optional: false,
    },
  },
  failedAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution failed (ISO string)',
      optional: false,
    },
  },
  duration: {
    type: 'long',
    _meta: {
      description: 'Total execution duration in milliseconds before failure',
      optional: false,
    },
  },
  timeToFirstStep: {
    type: 'long',
    _meta: {
      description: 'Time to first step (TTFS) in milliseconds',
      optional: true,
    },
  },
  stepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps in the workflow',
      optional: false,
    },
  },
  stepTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Step type',
      },
    },
    _meta: {
      description: 'Array of step types in the workflow',
      optional: false,
    },
  },
  connectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type',
      },
    },
    _meta: {
      description: 'Array of connector types used in the workflow',
      optional: false,
    },
  },
  hasScheduledTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has scheduled triggers',
      optional: false,
    },
  },
  hasAlertTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has alert triggers',
      optional: false,
    },
  },
  hasTimeout: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has timeout configured',
      optional: false,
    },
  },
  hasConcurrency: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has concurrency configured',
      optional: false,
    },
  },
  hasOnFailure: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has on-failure handlers',
      optional: false,
    },
  },
  errorMessage: {
    type: 'text',
    _meta: {
      description: 'The error message',
      optional: false,
    },
  },
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'The error type/category (e.g., ExecutionError, TimeoutError, CancellationError)',
      optional: false,
    },
  },
  failedStepId: {
    type: 'keyword',
    _meta: {
      description: 'The step ID where the error occurred (if applicable)',
      optional: true,
    },
  },
  failedStepType: {
    type: 'keyword',
    _meta: {
      description: 'The step type where the error occurred (if applicable)',
      optional: true,
    },
  },
  executedStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that were executed before failure',
      optional: false,
    },
  },
  successfulStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that completed successfully before failure',
      optional: false,
    },
  },
  errorHandled: {
    type: 'boolean',
    _meta: {
      description: 'Whether the error was handled by an on-failure handler',
      optional: false,
    },
  },
  executedConnectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type that was used',
      },
    },
    _meta: {
      description: 'Array of connector types that were actually used in execution',
      optional: false,
    },
  },
  maxExecutionDepth: {
    type: 'integer',
    _meta: {
      description: 'Maximum execution depth (nested scopes)',
      optional: false,
    },
  },
  hasRetries: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps were retried',
      optional: false,
    },
  },
  hasErrorHandling: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps used on-failure handlers (fallback, continue)',
      optional: false,
    },
  },
  uniqueStepIdsExecuted: {
    type: 'integer',
    _meta: {
      description: 'Number of unique step IDs that were executed (accounts for loops/retries)',
      optional: false,
    },
  },
  queueDelayMs: {
    type: 'long',
    _meta: {
      description:
        'Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing. Only present when workflow was queued due to concurrency limits or scheduling.',
      optional: true,
    },
  },
  emitToStartMs: {
    type: 'long',
    _meta: {
      description:
        'Time from event dispatch to workflow execution start in milliseconds. Only present for event-driven executions when dispatch metadata is available.',
      optional: true,
    },
  },
  timedOut: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow execution timed out',
      optional: false,
    },
  },
  timeoutMs: {
    type: 'long',
    _meta: {
      description: 'Configured timeout in milliseconds. Only present when timeout is configured.',
      optional: true,
    },
  },
  timeoutExceededByMs: {
    type: 'long',
    _meta: {
      description:
        'How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.',
      optional: true,
    },
  },
  stepDurations: {
    type: 'array',
    items: {
      type: 'pass_through',
      _meta: {
        description: 'Step duration entry with stepId, stepType (optional), and duration',
      },
    },
    _meta: {
      description:
        'Array of step durations with step identification. Only includes steps that have completed (have both startedAt and finishedAt).',
      optional: true,
    },
  },
  stepAvgDurationsByType: {
    type: 'pass_through',
    _meta: {
      description:
        'Average duration per step type (dictionary with sanitized step type as key). Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing. E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }',
      optional: true,
    },
  },
};

const workflowExecutionCancelledSchema: RootSchema<WorkflowExecutionCancelledParams> = {
  ...baseWorkflowExecutionSchema,
  ...eventNameSchema,
  startedAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution started (ISO string)',
      optional: false,
    },
  },
  cancelledAt: {
    type: 'date',
    _meta: {
      description: 'Timestamp when the execution was cancelled (ISO string)',
      optional: false,
    },
  },
  duration: {
    type: 'long',
    _meta: {
      description: 'Total execution duration in milliseconds before cancellation',
      optional: false,
    },
  },
  timeToFirstStep: {
    type: 'long',
    _meta: {
      description: 'Time to first step (TTFS) in milliseconds',
      optional: true,
    },
  },
  stepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps in the workflow',
      optional: false,
    },
  },
  stepTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Step type',
      },
    },
    _meta: {
      description: 'Array of step types in the workflow',
      optional: false,
    },
  },
  connectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type',
      },
    },
    _meta: {
      description: 'Array of connector types used in the workflow',
      optional: false,
    },
  },
  hasScheduledTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has scheduled triggers',
      optional: false,
    },
  },
  hasAlertTriggers: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has alert triggers',
      optional: false,
    },
  },
  hasTimeout: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has timeout configured',
      optional: false,
    },
  },
  hasConcurrency: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has concurrency configured',
      optional: false,
    },
  },
  hasOnFailure: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow has on-failure handlers',
      optional: false,
    },
  },
  cancellationReason: {
    type: 'text',
    _meta: {
      description: 'The cancellation reason',
      optional: true,
    },
  },
  cancelledBy: {
    type: 'keyword',
    _meta: {
      description: 'Who cancelled the workflow',
      optional: true,
    },
  },
  executedStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that were executed before cancellation',
      optional: false,
    },
  },
  successfulStepCount: {
    type: 'integer',
    _meta: {
      description: 'Number of steps that completed successfully before cancellation',
      optional: false,
    },
  },
  executedConnectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'Connector type that was used',
      },
    },
    _meta: {
      description: 'Array of connector types that were actually used in execution',
      optional: false,
    },
  },
  maxExecutionDepth: {
    type: 'integer',
    _meta: {
      description: 'Maximum execution depth (nested scopes)',
      optional: false,
    },
  },
  hasRetries: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps were retried',
      optional: false,
    },
  },
  hasErrorHandling: {
    type: 'boolean',
    _meta: {
      description: 'Whether any steps used on-failure handlers (fallback, continue)',
      optional: false,
    },
  },
  uniqueStepIdsExecuted: {
    type: 'integer',
    _meta: {
      description: 'Number of unique step IDs that were executed (accounts for loops/retries)',
      optional: false,
    },
  },
  queueDelayMs: {
    type: 'long',
    _meta: {
      description:
        'Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing. Only present when workflow was queued due to concurrency limits or scheduling.',
      optional: true,
    },
  },
  emitToStartMs: {
    type: 'long',
    _meta: {
      description:
        'Time from event dispatch to workflow execution start in milliseconds. Only present for event-driven executions when dispatch metadata is available.',
      optional: true,
    },
  },
  timedOut: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow execution timed out',
      optional: false,
    },
  },
  timeoutMs: {
    type: 'long',
    _meta: {
      description: 'Configured timeout in milliseconds. Only present when timeout is configured.',
      optional: true,
    },
  },
  timeoutExceededByMs: {
    type: 'long',
    _meta: {
      description:
        'How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.',
      optional: true,
    },
  },
  stepDurations: {
    type: 'array',
    items: {
      type: 'pass_through',
      _meta: {
        description: 'Step duration entry with stepId, stepType (optional), and duration',
      },
    },
    _meta: {
      description:
        'Array of step durations with step identification. Only includes steps that have completed (have both startedAt and finishedAt).',
      optional: true,
    },
  },
  stepAvgDurationsByType: {
    type: 'pass_through',
    _meta: {
      description:
        'Average duration per step type (dictionary with sanitized step type as key). Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing. E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }',
      optional: true,
    },
  },
};

const eventDrivenExecutionSuppressedSchema: RootSchema<EventDrivenExecutionSuppressedParams> = {
  ...eventDrivenExecutionSuppressedBaseSchema,
  ...eventNameSchema,
  logTriggerEventsEnabled: {
    type: 'boolean',
    _meta: {
      description: 'Whether trigger-event audit logging is enabled when suppression ran',
      optional: false,
    },
  },
};

export const workflowExecutionEventSchemas = {
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted]:
    workflowExecutionCompletedSchema,
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed]: workflowExecutionFailedSchema,
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled]:
    workflowExecutionCancelledSchema,
  [WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed]:
    eventDrivenExecutionSuppressedSchema,
};
