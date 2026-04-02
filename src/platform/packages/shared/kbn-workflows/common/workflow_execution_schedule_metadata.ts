/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Optional metadata passed when scheduling or executing a workflow from the
 * event-driven trigger path. Persisted on the execution document (see execution
 * engine `createAndPersistWorkflowExecution`) for latency and analytics.
 */
export interface WorkflowExecutionEventDispatchMetadata {
  /** ISO-8601 string or epoch ms when the emitting service handled the trigger event */
  eventDispatchTimestamp?: string | number;
  /** Registered trigger id for the emission (e.g. cases.caseCreated) */
  eventTriggerId?: string;
}
