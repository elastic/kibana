/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowExecutionTerminalPayloadSchema } from './workflow_execution_terminal_payload';
import type { WorkflowExecutionTerminalPayload } from './workflow_execution_terminal_payload';

export const WORKFLOW_TERMINATED_EVENT_TYPE = 'workflows.terminated' as const;

export const workflowTerminatedPayloadSchema = workflowExecutionTerminalPayloadSchema;

export type WorkflowTerminatedPayload = WorkflowExecutionTerminalPayload;

export const isWorkflowTerminatedPayload = (value: unknown): value is WorkflowTerminatedPayload =>
  workflowTerminatedPayloadSchema.safeParse(value).success;

export interface WorkflowTerminatedDomainEventMap {
  [WORKFLOW_TERMINATED_EVENT_TYPE]: WorkflowTerminatedPayload;
}
