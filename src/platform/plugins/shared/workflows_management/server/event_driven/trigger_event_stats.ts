/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerResolutionStats } from './resolve_workflow_subscriptions';

/** Scheduling outcomes after KQL-matched workflows are considered. */
export interface TriggerEventScheduleStats {
  depthSkippedCount: number;
  scheduledAttemptCount: number;
  scheduledSuccessCount: number;
  scheduledFailureCount: number;
}

export const createEmptyTriggerResolutionStats = (): TriggerResolutionStats => ({
  subscribedCount: 0,
  disabledCount: 0,
  kqlFalseCount: 0,
  kqlErrorCount: 0,
  matchedCount: 0,
});

export const createEmptyTriggerScheduleStats = (): TriggerEventScheduleStats => ({
  depthSkippedCount: 0,
  scheduledAttemptCount: 0,
  scheduledSuccessCount: 0,
  scheduledFailureCount: 0,
});
