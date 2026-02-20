/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BaseEditorContextParams,
  BaseResultActionParams,
  WorkflowEditorType,
  WorkflowTelemetryOrigin,
} from '../types';

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
   * Whether the workflow is enabled.
   * Always extracted from workflow definition (defaults to false if not provided).
   */
  enabled: boolean;
  /**
   * Total number of steps in the workflow (including nested steps).
   * Always extracted from workflow definition (defaults to 0 if not provided).
   */
  stepCount: number;
  /**
   * Unique connector types used in the workflow.
   * Always extracted from workflow definition (defaults to empty array if not provided).
   */
  connectorTypes: string[];
  /**
   * Unique step types used in the workflow (e.g., ['foreach', 'if', 'console']).
   * This array format enables easy aggregation in dashboards.
   */
  stepTypes: string[];
  /**
   * Count of steps by step type (e.g., { 'foreach': 2, 'slack.webhook': 5, 'if': 1 }).
   * Always extracted from workflow definition (defaults to empty object if not provided).
   */
  stepTypeCounts: Record<string, number>;
  /**
   * Trigger types configured in the workflow (e.g., ['scheduled', 'alert', 'index']).
   * This array format enables easy aggregation in dashboards.
   */
  triggerTypes: string[];
  /**
   * Maximum concurrent runs if concurrency is configured.
   * Only present when concurrency is configured.
   */
  concurrencyMax?: number;
  /**
   * Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress').
   * Only present when concurrency is configured.
   */
  concurrencyStrategy?: string;
  /**
   * Settings configured in the workflow (e.g., ['timeout', 'concurrency', 'on-failure']).
   * This array format enables easy aggregation in dashboards.
   */
  settingsUsed: string[];
  /**
   * Whether the workflow has a description.
   */
  hasDescription: boolean;
  /**
   * Number of tags assigned to the workflow.
   */
  tagCount: number;
  /**
   * Number of constants defined in the workflow.
   */
  constCount: number;
}

/**
 * Parameters for workflow update attempt telemetry.
 */
export interface ReportWorkflowUpdatedActionParams extends BaseResultActionParams {
  eventName: string;
  workflowId: string;
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
  /**
   * Fields that were updated in this operation
   */
  updatedFields?: string[];
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
  /**
   * Origin of the action: 'workflow_list' or 'workflow_detail'
   */
  origin?: WorkflowTelemetryOrigin;
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
  /**
   * Origin of the action: 'workflow_list' or 'workflow_detail'
   */
  origin?: WorkflowTelemetryOrigin;
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
  /**
   * Number of workflows in the bulk action (only present when isBulkAction is true)
   */
  bulkActionCount?: number;
}
