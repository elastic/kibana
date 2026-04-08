/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import {
  ExecutionTrackerProvider,
  useExecutionTracker as useInternalExecutionTracker,
  useOptionalExecutionTracker as useInternalOptionalExecutionTracker,
} from './model/execution_tracker_context';
import type { ExecutionTrackerApi } from './types';

export { ExecutionTrackerProvider };

export const useExecutionTracker = (): ExecutionTrackerApi => {
  const ctx = useInternalExecutionTracker();
  return useMemo(
    () => ({
      executions: ctx.executions,
      trackExecutions: ctx.trackExecutions,
      dismissExecution: ctx.dismissExecution,
    }),
    [ctx.executions, ctx.trackExecutions, ctx.dismissExecution]
  );
};

export const useOptionalExecutionTracker = (): ExecutionTrackerApi | null => {
  const ctx = useInternalOptionalExecutionTracker();
  return useMemo(() => {
    if (!ctx) return null;
    return {
      executions: ctx.executions,
      trackExecutions: ctx.trackExecutions,
      dismissExecution: ctx.dismissExecution,
    };
  }, [ctx]);
};
