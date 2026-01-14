/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowEditorType } from '../types';

export enum WorkflowValidationEventTypes {
  /**
   * When a workflow validation error occurs
   * This tracks validation issues users encounter when creating or updating workflows.
   */
  WorkflowValidationError = 'workflows_workflow_validation_error',
}

export type WorkflowValidationErrorType =
  | 'schema'
  | 'step_name_duplicate'
  | 'invalid_yaml'
  | 'missing_connector'
  | 'invalid_step_config'
  | 'other';

/**
 * Parameters for workflow validation error telemetry.
 */
export interface ReportWorkflowValidationErrorActionParams {
  eventName: string;
  /**
   * The workflow ID if validation error occurred on existing workflow. Undefined for new workflows.
   */
  workflowId?: string;
  /**
   * The type of validation error
   */
  errorType: WorkflowValidationErrorType;
  /**
   * The error message
   */
  errorMessage: string;
  /**
   * Editor context if error occurred on workflow detail page
   */
  editorType?: WorkflowEditorType;
}

