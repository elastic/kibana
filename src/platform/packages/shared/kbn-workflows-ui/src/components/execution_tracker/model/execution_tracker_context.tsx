/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { ExecutionTrackerContextValue } from './types';
import { usePollExecutionStatus } from './use_poll_execution_status';
import type {
  InputSummaryEntry,
  PollExecutionStatusEntry,
  RenderOutputContent,
  TrackedExecution,
} from '../types';
import { ExecutionTrackerBadge } from '../ui/execution_tracker_badge';
import { ExecutionTrackerFlyout } from '../ui/execution_tracker_flyout';

const ExecutionTrackerContext = createContext<ExecutionTrackerContextValue | null>(null);

/**
 * Returns the execution tracker context if available, or `null` if the provider
 * is not mounted. Useful in cross-plugin components where the provider may not
 * be present in the React tree.
 */
export const useOptionalExecutionTracker = (): ExecutionTrackerContextValue | null =>
  useContext(ExecutionTrackerContext);

export const useExecutionTracker = (): ExecutionTrackerContextValue => {
  const ctx = useContext(ExecutionTrackerContext);
  if (!ctx) {
    throw new Error('useExecutionTracker must be used within an ExecutionTrackerProvider');
  }
  return ctx;
};

interface ExecutionTrackerProviderProps extends PropsWithChildren {
  renderOutputContent?: RenderOutputContent;
}

export const ExecutionTrackerProvider: FC<ExecutionTrackerProviderProps> = ({
  children,
  renderOutputContent,
}) => {
  const [executions, setExecutions] = useState<TrackedExecution[]>([]);
  const [isFlyoutOpen, setFlyoutOpen] = useState(false);

  const trackExecutions = useCallback(
    (
      entries: Array<{
        id: string;
        workflowId?: string;
        workflowName?: string;
        inputSummary?: InputSummaryEntry[];
      }>
    ) => {
      setExecutions((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newEntries: TrackedExecution[] = entries
          .filter((entry) => !existingIds.has(entry.id))
          .map((entry) => ({
            ...entry,
            status: ExecutionStatus.PENDING,
            addedAt: Date.now(),
          }));
        return newEntries.length > 0 ? [...prev, ...newEntries] : prev;
      });
    },
    []
  );

  const dismissExecution = useCallback((id: string) => {
    setExecutions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const dismissAllCompleted = useCallback(() => {
    setExecutions((prev) => prev.filter((e) => !isTerminalStatus(e.status)));
  }, []);

  const onStatusUpdate = useCallback((statuses: Record<string, PollExecutionStatusEntry>) => {
    setExecutions((prev) =>
      prev.map((execution) => {
        const update = statuses[execution.id];
        if (!update) {
          return execution;
        }
        return {
          ...execution,
          status: update.status,
          error: update.error?.message ?? null,
          output: update.output,
        };
      })
    );
  }, []);

  const activeIds = useMemo(
    () => executions.filter((e) => !isTerminalStatus(e.status)).map((e) => e.id),
    [executions]
  );

  usePollExecutionStatus(activeIds, onStatusUpdate);

  const counts = useMemo(() => {
    let running = 0;
    let completed = 0;
    let failed = 0;
    for (const e of executions) {
      if (e.status === ExecutionStatus.COMPLETED) {
        completed++;
      } else if (
        e.status === ExecutionStatus.FAILED ||
        e.status === ExecutionStatus.TIMED_OUT ||
        e.status === ExecutionStatus.CANCELLED
      ) {
        failed++;
      } else {
        running++;
      }
    }
    return { running, completed, failed, total: executions.length };
  }, [executions]);

  const value: ExecutionTrackerContextValue = useMemo(
    () => ({
      executions,
      trackExecutions,
      dismissExecution,
      dismissAllCompleted,
      isFlyoutOpen,
      setFlyoutOpen,
      counts,
      renderOutputContent,
    }),
    [
      executions,
      trackExecutions,
      dismissExecution,
      dismissAllCompleted,
      isFlyoutOpen,
      counts,
      renderOutputContent,
    ]
  );

  return (
    <ExecutionTrackerContext.Provider value={value}>
      {children}
      <ExecutionTrackerBadge />
      {isFlyoutOpen && <ExecutionTrackerFlyout />}
    </ExecutionTrackerContext.Provider>
  );
};
