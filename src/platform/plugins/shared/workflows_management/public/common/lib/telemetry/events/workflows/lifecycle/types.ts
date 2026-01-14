/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseEditorContextParams, BaseResultActionParams, WorkflowEditorType } from '../types';

export enum WorkflowLifecycleEventTypes {
  /**
   * When a workflow creation is attempted (request sent to server)
   * This event tracks both successful and failed creation attempts.
   * The `result` field indicates whether the creation succeeded or failed.
   */
  WorkflowCreated = 'workflows_workflow_created',
  /**
   * When a workflow update is attempted (request sent to server)
   * This event tracks both successful and failed update attempts.
   */
  WorkflowUpdated = 'workflows_workflow_updated',
  /**
   * When a workflow deletion is attempted (request sent to server)
   * This event tracks both successful and failed deletion attempts.
   */
  WorkflowDeleted = 'workflows_workflow_deleted',
  /**
   * When a workflow clone is attempted (request sent to server)
   * This event tracks both successful and failed clone attempts.
   */
  WorkflowCloned = 'workflows_workflow_cloned',
  /**
   * When a workflow enabled state is changed (enabled or disabled, request sent to server)
   * This event tracks both successful and failed state change attempts.
   */
  WorkflowEnabledStateChanged = 'workflows_workflow_enabled_state_changed',
}

export type WorkflowUpdateType = 'yaml' | 'metadata' | 'enabled' | 'tags' | 'description';

/**
 * Parameters for workflow creation attempt telemetry.
 * Note: This event is fired after the creation request completes (success or failure).
 * workflowId will be undefined if the creation failed.
 */
export interface ReportWorkflowCreatedActionParams
  extends BaseResultActionParams,
    BaseEditorContextParams {
  eventName: string;
  /**
   * The workflow ID if creation succeeded. Undefined if creation failed.
   */
  workflowId?: string;
  /**
   * Total number of steps in the workflow (including nested steps).
   * Automatically extracted from workflow definition if provided.
   */
  stepCount?: number;
  /**
   * Unique connector types used in the workflow.
   * Automatically extracted from workflow definition if provided.
   */
  connectorTypes?: string[];
  /**
   * Count of steps by step type (e.g., { 'foreach': 2, 'slack.webhook': 5, 'if': 1 }).
   * Automatically extracted from workflow definition if provided.
   */
  stepTypeCounts?: Record<string, number>;
  /**
   * Whether the workflow has scheduled triggers.
   * Automatically extracted from workflow definition if provided.
   */
  hasScheduledTriggers?: boolean;
  /**
   * Whether the workflow has alert triggers.
   * Automatically extracted from workflow definition if provided.
   */
  hasAlertTriggers?: boolean;
  /**
   * Whether the workflow has a timeout configured.
   * Automatically extracted from workflow definition if provided.
   */
  hasTimeout?: boolean;
  /**
   * Whether the workflow has concurrency settings configured.
   * Automatically extracted from workflow definition if provided.
   */
  hasConcurrency?: boolean;
  /**
   * Maximum concurrent runs if concurrency is configured.
   * Automatically extracted from workflow definition if provided.
   */
  concurrencyMax?: number;
  /**
   * Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress').
   * Automatically extracted from workflow definition if provided.
   */
  concurrencyStrategy?: string;
  /**
   * Whether the workflow has on-failure handling configured.
   * Automatically extracted from workflow definition if provided.
   */
  hasOnFailure?: boolean;
}

/**
 * Parameters for workflow update attempt telemetry.
 */
export interface ReportWorkflowUpdatedActionParams extends BaseResultActionParams {
  eventName: string;
  workflowId: string;
  /**
   * The type of update being performed
   */
  updateType: WorkflowUpdateType;
  /**
   * Whether the update resulted in validation errors
   */
  hasValidationErrors: boolean;
  /**
   * Number of validation errors (0 if none)
   */
  validationErrorCount: number;
  /**
   * Types of validation errors encountered
   */
  validationErrorTypes?: string[];
  /**
   * Editor context if update was initiated from workflow detail page
   */
  editorType?: WorkflowEditorType;
}

/**
 * Parameters for workflow deletion attempt telemetry.
 */
export interface ReportWorkflowDeletedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The workflow IDs being deleted
   */
  workflowIds: string[];
  /**
   * Whether this is a bulk delete operation
   */
  isBulkDelete: boolean;
}

/**
 * Parameters for workflow clone attempt telemetry.
 */
export interface ReportWorkflowClonedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The source workflow ID being cloned
   */
  sourceWorkflowId: string;
  /**
   * The new workflow ID if clone succeeded. Undefined if clone failed.
   */
  newWorkflowId?: string;
  /**
   * Editor context if clone was initiated from workflow detail page
   */
  editorType?: WorkflowEditorType;
}

/**
 * Parameters for workflow enabled state change attempt telemetry.
 */
export interface ReportWorkflowEnabledStateChangedActionParams
  extends BaseResultActionParams,
    BaseEditorContextParams {
  eventName: string;
  workflowId: string;
  /**
   * The new enabled state (true = enabled, false = disabled)
   */
  enabled: boolean;
  /**
   * Whether this is a bulk operation
   */
  isBulkAction: boolean;
}
