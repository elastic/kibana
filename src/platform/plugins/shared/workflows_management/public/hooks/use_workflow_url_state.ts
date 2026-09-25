/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, stringify } from 'query-string';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { LayoutDirection } from '@kbn/workflows';
import {
  getStoredEditorView,
  getStoredGraphDirection,
  setStoredEditorView,
  setStoredGraphDirection,
} from '../lib/workflow_editor_preferences';

export type WorkflowUrlStateTabType = 'workflow' | 'executions';
export type WorkflowEditorView = 'yaml' | 'graph';

export interface WorkflowUrlState {
  tab?: WorkflowUrlStateTabType;
  view?: WorkflowEditorView;
  direction?: LayoutDirection;
  executionId?: string;
  stepExecutionId?: string;
  stepId?: string;
  resume?: boolean;
  replayExecutionId?: string;
}

export interface WorkflowUrlUpdateOptions {
  /**
   * Replace the current history entry instead of pushing a new one. Use it for normalisation and
   * cleanup (consuming a one-shot param, defaulting a selection), so Back skips the intermediate URL.
   */
  replace?: boolean;
}

export type WorkflowUrlSelectionSetter = (
  value: string | null,
  options?: WorkflowUrlUpdateOptions
) => void;

/**
 * History-entry state for the run flyout: how many entries were pushed since the last entry with
 * no `executionId` (1 on the entry that opened the run), and whether that earlier entry exists in
 * this history. It does not for a deep link that opened the page with a run already selected.
 */
interface RunEntryState {
  depth: number;
  openedInApp: boolean;
}

const RUN_ENTRY_STATE_KEY = 'workflowsRunEntry';

const getRunEntryState = (state: unknown): RunEntryState | undefined => {
  const value = (state as Record<string, unknown> | null | undefined)?.[RUN_ENTRY_STATE_KEY] as
    | Partial<RunEntryState>
    | undefined;
  return typeof value?.depth === 'number' && value.depth > 0
    ? { depth: value.depth, openedInApp: value.openedInApp === true }
    : undefined;
};

/** Returns the entry state with the run entry set, keeping any other state it carries. */
const withRunEntryState = (
  state: unknown,
  runEntry: RunEntryState | undefined
): Record<string, unknown> => {
  const rest =
    state != null && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
  delete rest[RUN_ENTRY_STATE_KEY];
  return runEntry ? { ...rest, [RUN_ENTRY_STATE_KEY]: runEntry } : rest;
};

/**
 * Normalise a `query-string` value (which may be `string | string[] | null`)
 * to `string | undefined`, taking the first element of any array.
 */
function firstString(value: string | string[] | null | undefined): string | undefined {
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value ?? undefined;
}

export function useWorkflowUrlState() {
  const history = useHistory();
  const location = useLocation();

  const urlState = useMemo((): {
    tab: WorkflowUrlStateTabType;
    view: WorkflowEditorView;
    direction: LayoutDirection;
    executionId: string | undefined;
    stepExecutionId: string | undefined;
    stepId: string | undefined;
    shouldAutoResume: boolean;
    replayExecutionId: string | undefined;
  } => {
    const params = parse(location.search);
    return {
      tab: (firstString(params.tab) as WorkflowUrlStateTabType) || 'workflow',
      view:
        getStoredEditorView() ??
        (params.view === 'graph' || params.view === 'yaml'
          ? (params.view as WorkflowEditorView)
          : 'yaml'),
      direction:
        getStoredGraphDirection() ??
        (params.direction === 'LR' || params.direction === 'TB'
          ? (params.direction as LayoutDirection)
          : 'TB'),
      executionId: firstString(params.executionId),
      stepExecutionId: firstString(params.stepExecutionId),
      stepId: firstString(params.stepId),
      shouldAutoResume: firstString(params.resume) === 'true',
      replayExecutionId: firstString(params.replayExecutionId),
    };
  }, [location.search]);

  const updateUrlState = useCallback(
    (updates: Partial<WorkflowUrlState>, { replace = true }: WorkflowUrlUpdateOptions = {}) => {
      const currentParams = parse(history.location.search);

      // Update the params with new values
      const newParams = {
        ...currentParams,
        ...updates,
      };

      // Remove undefined/null values to keep URL clean
      const cleanParams: Record<string, string | boolean> = {};
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanParams[key] = value as string | boolean;
        }
      });

      // Update the URL without causing a full page reload
      const newSearch = stringify(cleanParams, { encode: false });
      const nextSearch = newSearch ? `?${newSearch}` : '';
      if (nextSearch === history.location.search) {
        return;
      }

      const currentExecutionId = firstString(currentParams.executionId);
      const nextExecutionId = firstString(cleanParams.executionId as string | undefined);
      // A deep-linked run has no state yet: its entry counts as depth 1 with nothing before it.
      const currentRunEntry =
        getRunEntryState(history.location.state) ??
        (currentExecutionId ? { depth: 1, openedInApp: false } : undefined);

      if (!replace) {
        let nextRunEntry: RunEntryState | undefined;
        if (nextExecutionId) {
          nextRunEntry = currentRunEntry
            ? { depth: currentRunEntry.depth + 1, openedInApp: currentRunEntry.openedInApp }
            : { depth: 1, openedInApp: true };
        }
        history.push({
          ...history.location,
          search: nextSearch,
          state: withRunEntryState(history.location.state, nextRunEntry),
        });
        return;
      }

      let replacedRunEntry: RunEntryState | undefined;
      if (nextExecutionId) {
        replacedRunEntry = currentRunEntry ?? { depth: 1, openedInApp: false };
      }
      const nextLocation = {
        ...history.location,
        search: nextSearch,
        state: withRunEntryState(history.location.state, replacedRunEntry),
      };

      // Closing a run without a navigation (a filter change, a cleanup) must leave none of its
      // entries reachable, or Back or Forward reopens the run against state that no longer
      // matches it. Replacing only the current entry is not enough once steps inside the run
      // pushed more.
      if (currentExecutionId && !nextExecutionId && currentRunEntry) {
        const { depth, openedInApp } = currentRunEntry;
        if (openedInApp) {
          // Go to the entry before the run and push from it: the push discards every run entry.
          const unlisten = history.listen(() => {
            unlisten();
            history.push(nextLocation);
          });
          history.go(-depth);
          return;
        }
        if (depth > 1) {
          // Nothing before a deep-linked run: replace its first entry instead.
          const unlisten = history.listen(() => {
            unlisten();
            history.replace(nextLocation);
          });
          history.go(-(depth - 1));
          return;
        }
      }

      history.replace(nextLocation);
    },
    [history]
  );

  const setActiveTab = useCallback(
    (tab: 'workflow' | 'executions', options: WorkflowUrlUpdateOptions = {}) => {
      // When switching to other tab, clear execution selection
      updateUrlState(
        {
          executionId: undefined,
          stepExecutionId: undefined,
          stepId: undefined,
          tab,
        },
        { replace: false, ...options }
      );
    },
    [updateUrlState]
  );

  const setSelectedExecution = useCallback<WorkflowUrlSelectionSetter>(
    (executionId, options = {}) => {
      updateUrlState(
        {
          executionId: executionId || undefined,
          stepExecutionId: undefined,
          stepId: undefined,
        },
        { replace: false, ...options }
      );
    },
    [updateUrlState]
  );

  const setSelectedStepExecution = useCallback<WorkflowUrlSelectionSetter>(
    (stepExecutionId, options = {}) => {
      updateUrlState(
        {
          stepExecutionId: stepExecutionId || undefined,
          stepId: undefined,
        },
        { replace: false, ...options }
      );
    },
    [updateUrlState]
  );

  /**
   * Authoring-time selection in the editor, not navigation: the step panel is part of the editing
   * surface, so Back should leave the workflow page rather than walk back through step clicks.
   */
  const setSelectedStep = useCallback<WorkflowUrlSelectionSetter>(
    (stepId, options = {}) => {
      updateUrlState(
        {
          stepId: stepId || undefined,
        },
        options
      );
    },
    [updateUrlState]
  );

  const clearResumeParam = useCallback(() => {
    updateUrlState({ resume: undefined });
  }, [updateUrlState]);

  const clearReplayExecutionId = useCallback(() => {
    updateUrlState({ replayExecutionId: undefined });
  }, [updateUrlState]);

  const setEditorView = useCallback(
    (view: WorkflowEditorView) => {
      setStoredEditorView(view);
      updateUrlState({
        view,
        // Clear the flyout selection when switching views
        stepId: undefined,
      });
    },
    [updateUrlState]
  );

  const setGraphDirection = useCallback(
    (direction: LayoutDirection) => {
      setStoredGraphDirection(direction);
      updateUrlState({ direction });
    },
    [updateUrlState]
  );

  return {
    // Current state
    activeTab: urlState.tab,
    editorView: urlState.view,
    graphDirection: urlState.direction,
    selectedExecutionId: urlState.executionId,
    selectedStepExecutionId: urlState.stepExecutionId,
    selectedStepId: urlState.stepId,
    shouldAutoResume: urlState.shouldAutoResume,
    replayExecutionId: urlState.replayExecutionId,

    // State setters
    setActiveTab,
    setEditorView,
    setGraphDirection,
    setSelectedExecution,
    setSelectedStepExecution,
    setSelectedStep,
    updateUrlState,
    clearResumeParam,
    clearReplayExecutionId,
  };
}
