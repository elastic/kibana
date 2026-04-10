/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { ExecutionTrackerCounts } from './model/types';
import type {
  InputSummaryEntry,
  PollExecutionStatusEntry,
  RenderOutputContent,
  TrackedExecution,
} from './types';
import { WorkflowApi } from '../../api/workflows_api';

const RETRY_DELAY_MS = 5_000;

export interface ExecutionTrackerServiceState {
  executions: TrackedExecution[];
  counts: ExecutionTrackerCounts;
  isFlyoutOpen: boolean;
}

/**
 * Imperative service that manages execution tracker state outside of React.
 * Can be used both by Chrome nav controls (which render outside app React trees)
 * and by React components via the `useExecutionTrackerService` hook.
 */
export class ExecutionTrackerService {
  private readonly api: WorkflowApi;
  private readonly outputRenderers = new Map<string, RenderOutputContent>();
  private pollController: AbortController | null = null;
  private pollCancelled = false;

  public readonly state$ = new BehaviorSubject<ExecutionTrackerServiceState>({
    executions: [],
    counts: { running: 0, completed: 0, failed: 0, total: 0 },
    isFlyoutOpen: false,
  });

  public readonly application: ApplicationStart;

  constructor(http: HttpSetup, application: ApplicationStart) {
    this.api = new WorkflowApi(http);
    this.application = application;
  }

  public trackExecutions = (
    entries: Array<{
      id: string;
      workflowId?: string;
      workflowName?: string;
      inputSummary?: InputSummaryEntry[];
    }>
  ): void => {
    const current = this.state$.getValue();
    const existingIds = new Set(current.executions.map((e) => e.id));
    const newEntries: TrackedExecution[] = entries
      .filter((entry) => !existingIds.has(entry.id))
      .map((entry) => ({
        ...entry,
        status: ExecutionStatus.PENDING,
        addedAt: Date.now(),
      }));

    if (newEntries.length > 0) {
      this.updateExecutions([...current.executions, ...newEntries]);
      this.restartPolling();
    }
  };

  public dismissExecution = (id: string): void => {
    const current = this.state$.getValue();
    this.updateExecutions(current.executions.filter((e) => e.id !== id));
  };

  public dismissAllCompleted = (): void => {
    const current = this.state$.getValue();
    this.updateExecutions(current.executions.filter((e) => !isTerminalStatus(e.status)));
  };

  public setFlyoutOpen = (open: boolean): void => {
    const current = this.state$.getValue();
    this.state$.next({ ...current, isFlyoutOpen: open });
  };

  public toggleFlyout = (): void => {
    this.setFlyoutOpen(!this.state$.getValue().isFlyoutOpen);
  };

  public registerOutputRenderer = (id: string, renderer: RenderOutputContent): void => {
    this.outputRenderers.set(id, renderer);
  };

  public getRenderOutputContent = (): RenderOutputContent | undefined => {
    if (this.outputRenderers.size === 0) return undefined;

    return (execution) => {
      for (const renderer of this.outputRenderers.values()) {
        const result = renderer(execution);
        if (result) return result;
      }
      return null;
    };
  };

  public destroy(): void {
    this.stopPolling();
    this.state$.complete();
  }

  private updateExecutions(executions: TrackedExecution[]): void {
    this.state$.next({
      ...this.state$.getValue(),
      executions,
      counts: this.computeCounts(executions),
    });
  }

  private computeCounts(executions: TrackedExecution[]): ExecutionTrackerCounts {
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
  }

  private stopPolling(): void {
    this.pollCancelled = true;
    this.pollController?.abort();
    this.pollController = null;
  }

  private restartPolling(): void {
    this.stopPolling();
    this.pollCancelled = false;
    this.pollController = new AbortController();
    this.poll(this.pollController);
  }

  private async poll(controller: AbortController): Promise<void> {
    while (!this.pollCancelled) {
      const activeIds = this.state$
        .getValue()
        .executions.filter((e) => !isTerminalStatus(e.status))
        .map((e) => e.id);

      if (activeIds.length === 0) {
        return;
      }

      try {
        const { statuses } = await this.api.pollExecutionStatus(activeIds, controller.signal);
        if (!this.pollCancelled) {
          this.applyStatusUpdates(statuses);
        }
      } catch (err) {
        if (err.name === 'AbortError' || this.pollCancelled) {
          return;
        }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, RETRY_DELAY_MS);
          controller.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true }
          );
        });
      }
    }
  }

  private applyStatusUpdates(statuses: Record<string, PollExecutionStatusEntry>): void {
    const current = this.state$.getValue();
    const updated = current.executions.map((execution) => {
      const update = statuses[execution.id];
      if (!update) return execution;
      return {
        ...execution,
        status: update.status,
        error: update.error?.message ?? null,
        output: update.output,
      };
    });
    this.updateExecutions(updated);
  }
}
