/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Topic } from '@kbn/core-pubsub-server';

/** Terminal status a workflow execution can finish in. */
export type WorkflowExecutionFinishedStatus =
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'skipped';

/**
 * Fact published when a workflow execution first reaches a terminal status.
 * Producers and consumers each call `defineTopic` with {@link WorkflowExecutionFinishedTopic}.
 */
export interface WorkflowExecutionFinishedData {
  executionId: string;
  workflowId: string;
  spaceId: string;
  status: WorkflowExecutionFinishedStatus;
  finishedAt: string;
  isTestRun: boolean;
  triggeredBy?: string;
  durationMs?: number;
  errorType?: string;
}

export type WorkflowExecutionFinishedTopic = Topic<
  WorkflowExecutionFinishedData,
  'workflows.executionFinished'
>;
