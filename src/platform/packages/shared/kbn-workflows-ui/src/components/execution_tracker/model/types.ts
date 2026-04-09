/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InputSummaryEntry, RenderOutputContent, TrackedExecution } from '../types';

export interface ExecutionTrackerCounts {
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface ExecutionTrackerContextValue {
  executions: TrackedExecution[];
  trackExecutions: (
    entries: Array<{
      id: string;
      workflowId?: string;
      workflowName?: string;
      inputSummary?: InputSummaryEntry[];
    }>
  ) => void;
  dismissExecution: (id: string) => void;
  dismissAllCompleted: () => void;
  isFlyoutOpen: boolean;
  setFlyoutOpen: (open: boolean) => void;
  counts: ExecutionTrackerCounts;
  renderOutputContent?: RenderOutputContent;
}
