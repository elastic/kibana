/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowLogEvent } from '../workflow_event_logger/workflow_event_logger';

/**
 * Interface for workflow context manager logging capabilities
 * Used by runtime manager to avoid circular dependencies
 *
 * Simplified interface focusing on actual logging needs
 */
export interface IWorkflowContextLogger {
  // Basic logging methods
  logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logError(message: string, error?: Error, additionalData?: Partial<WorkflowLogEvent>): void;
  logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void;

  // Timing methods
  startTiming(event: WorkflowLogEvent): void;
  stopTiming(event: WorkflowLogEvent): void;

  // Workflow-level logging
  logWorkflowStart(): void;
  logWorkflowComplete(success?: boolean): void;

  // Step-level logging (no state management needed)
  logStepStart(stepId: string, stepName?: string): void;
  logStepComplete(stepId: string, stepName?: string, success?: boolean): void;
}
