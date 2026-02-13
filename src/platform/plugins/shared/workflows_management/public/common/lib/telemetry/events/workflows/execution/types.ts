/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseResultActionParams, WorkflowEditorType } from '../types';

export enum WorkflowExecutionEventTypes {
  /**
   * When a workflow test run is initiated from the UI
   * This event tracks test run initiation attempts.
   */
  WorkflowTestRunInitiated = 'workflows_workflow_test_run_initiated',
  /**
   * When an individual step test run is initiated from the UI
   * This event tracks step test run initiation attempts.
   */
  WorkflowStepTestRunInitiated = 'workflows_workflow_step_test_run_initiated',
  /**
   * When a workflow manual run (non-test) is initiated from the UI
   * This event tracks manual run initiation attempts.
   */
  WorkflowRunInitiated = 'workflows_workflow_run_initiated',
  /**
   * When a workflow run cancellation is requested from the UI
   * This event tracks cancellation request attempts.
   */
  WorkflowRunCancelled = 'workflows_workflow_run_cancelled',
}

export type WorkflowTriggerType = 'manual' | 'alert' | 'scheduled';

/**
 * Trigger tab types available in the Test Workflow modal
 */
export type WorkflowTriggerTab = 'manual' | 'alert' | 'index';

/**
 * Parameters for workflow test run initiation telemetry.
 */
export interface ReportWorkflowTestRunInitiatedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The workflow ID if test run is for existing workflow. Undefined for new workflows.
   */
  workflowId?: string;
  /**
   * Whether the test run has inputs
   */
  hasInputs: boolean;
  /**
   * Number of inputs provided
   */
  inputCount: number;
  /**
   * Editor context if test run was initiated from workflow detail page
   */
  editorType?: WorkflowEditorType;
  /**
   * The trigger tab selected in the Test Workflow modal: 'manual', 'alert', or 'index'
   */
  triggerTab?: WorkflowTriggerTab;
}

/**
 * Parameters for workflow step test run initiation telemetry.
 */
export interface ReportWorkflowStepTestRunInitiatedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The workflow ID if step test is for existing workflow. Undefined for new workflows.
   */
  workflowId?: string;
  /**
   * The step ID being tested
   */
  stepId: string;
  /**
   * The type of step being tested (e.g., 'connector', 'if', 'foreach')
   */
  stepType: string;
  /**
   * The connector type if step uses a connector
   */
  connectorType?: string;
  /**
   * Editor context if step test was initiated from workflow detail page
   */
  editorType?: WorkflowEditorType;
}

/**
 * Parameters for workflow manual run initiation telemetry.
 */
export interface ReportWorkflowRunInitiatedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The workflow ID
   */
  workflowId: string;
  /**
   * Whether the run has inputs
   */
  hasInputs: boolean;
  /**
   * Number of inputs provided
   */
  inputCount: number;
  /**
   * Editor context if run was initiated from workflow detail page
   */
  editorType?: WorkflowEditorType;
  /**
   * The trigger tab selected in the Test Workflow modal: 'manual', 'alert', or 'index'
   */
  triggerTab?: WorkflowTriggerTab;
}

/**
 * Parameters for workflow run cancellation telemetry.
 */
export interface ReportWorkflowRunCancelledActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * The workflow execution ID being cancelled
   */
  workflowExecutionId: string;
  /**
   * The workflow ID (optional, may not be available for test runs)
   */
  workflowId?: string;
  /**
   * Time in milliseconds from execution start to cancellation request
   */
  timeToCancellation?: number;
}
