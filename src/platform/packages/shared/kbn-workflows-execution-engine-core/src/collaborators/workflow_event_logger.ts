/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowLogEvent } from './workflow_log_event';

/**
 * Logger consumed by flow-control nodes and the execution loop.
 *
 * The plugin's concrete logger writes to an Elasticsearch data stream; that
 * I/O detail is irrelevant to the package — it just needs to know that calls
 * are queued and `flushEvents()` will flush them. Implementations must be
 * non-throwing on every method except `flushEvents()`.
 */
export interface IWorkflowEventLogger {
  logEvent(event: WorkflowLogEvent): void;
  logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logError(message: string, error?: Error, additionalData?: Partial<WorkflowLogEvent>): void;
  logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  flushEvents(): Promise<void>;
}
