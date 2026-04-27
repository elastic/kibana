/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum WorkflowImportExportEventTypes {
  /**
   * When a workflow export is attempted.
   * Tracks both successful and failed export attempts.
   */
  WorkflowExported = 'workflows_workflow_exported',
  /**
   * When a workflow import is attempted.
   * Tracks both successful and failed import attempts.
   */
  WorkflowImported = 'workflows_workflow_imported',
}

import type { BaseResultActionParams } from '../types';

export type WorkflowExportReferenceResolution = 'none' | 'ignore' | 'add_direct' | 'add_all';

export interface ReportWorkflowExportedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * Number of workflows exported.
   */
  workflowCount: number;
  /**
   * Export format: 'yaml' for single workflow, 'zip' for multiple.
   */
  format: 'yaml' | 'zip';
  /**
   * How workflow references were resolved:
   * - 'none': no missing references detected
   * - 'ignore': user chose to export without adding references
   * - 'add_direct': user added only direct missing references
   * - 'add_all': user added all transitive references
   */
  referenceResolution: WorkflowExportReferenceResolution;
}

export interface ReportWorkflowImportedActionParams extends BaseResultActionParams {
  eventName: string;
  /**
   * Total number of workflows in the import file.
   */
  workflowCount: number;
  /**
   * Import file format: 'yaml' or 'zip'.
   */
  format: 'yaml' | 'zip';
  /**
   * Conflict resolution strategy chosen by the user.
   */
  conflictResolution: 'generateNewIds' | 'overwrite';
  /**
   * Whether any ID conflicts were detected during preflight.
   */
  hasConflicts: boolean;
  /**
   * Number of workflows successfully imported.
   */
  successCount: number;
  /**
   * Number of workflows that failed to import.
   */
  failedCount: number;
  /**
   * Minimum step count across all imported workflows.
   */
  minStepCount: number;
  /**
   * Maximum step count across all imported workflows.
   */
  maxStepCount: number;
  /**
   * Minimum trigger count across all imported workflows.
   */
  minTriggerCount: number;
  /**
   * Maximum trigger count across all imported workflows.
   */
  maxTriggerCount: number;
}
