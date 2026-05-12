/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { Subject, switchMap, takeUntil, timer } from 'rxjs';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';
import { loadExecutionThunk } from '../store/workflow_detail/thunks/load_execution_thunk';

export const PollingIntervalMs = 1000 as const;

interface PollingState {
  workflowExecution: WorkflowExecutionDto | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * This hook uses RxJS operators for a more declarative approach.
 * It uses RxJS's built-in operators for polling and cleanup.
 */
export const useWorkflowExecutionPolling = (workflowExecutionId: string): PollingState => {
  const [loadExecution, { result: workflowExecution, error }] =
    useAsyncThunkState(loadExecutionThunk);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const stopSubjectRef = useRef<Subject<void>>(new Subject<void>());

  useEffect(() => {
    // Create a new stop subject for this polling cycle
    const stop$ = new Subject<void>();
    stopSubjectRef.current = stop$;
    setIsLoading(true);

    // Create an observable that polls at intervals, starting immediately
    // timer(0, PollingIntervalMs) emits immediately (0ms) then every PollingIntervalMs
    const polling$ = timer(0, PollingIntervalMs).pipe(
      switchMap(() => loadExecution({ id: workflowExecutionId })),
      takeUntil(stop$)
    );

    const subscription = polling$.subscribe();

    return () => {
      subscription.unsubscribe();
      stop$.next();
      setIsLoading(false);
    };
  }, [workflowExecutionId, loadExecution]);

  // Stop polling when execution reaches terminal state
  useEffect(() => {
    if (workflowExecution && isTerminalStatus(workflowExecution.status)) {
      stopSubjectRef.current.next();
      setIsLoading(false);
    }
  }, [workflowExecution]);

  return { workflowExecution, isLoading, error };
};
