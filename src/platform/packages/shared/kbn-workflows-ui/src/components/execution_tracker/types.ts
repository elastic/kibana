/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { ExecutionStatus } from '@kbn/workflows';

export interface InputSummaryEntry {
  label: string;
  value: string;
}

export interface TrackedExecution {
  id: string;
  workflowId?: string;
  workflowName?: string;
  inputSummary?: InputSummaryEntry[];
  status: ExecutionStatus;
  error?: string | null;
  output?: Record<string, unknown>;
  addedAt: number;
}

export interface TrackExecutionEntry {
  id: string;
  workflowId?: string;
  workflowName?: string;
  inputSummary?: InputSummaryEntry[];
}

export interface PollExecutionStatusEntry {
  status: ExecutionStatus;
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  output?: Record<string, unknown>;
}

export interface PollExecutionStatusResponse {
  statuses: Record<string, PollExecutionStatusEntry>;
}

export type RenderOutputContent = (execution: TrackedExecution) => ReactNode | null;

export interface ExecutionTrackerApi {
  executions: TrackedExecution[];
  trackExecutions: (entries: TrackExecutionEntry[]) => void;
  dismissExecution: (id: string) => void;
}
