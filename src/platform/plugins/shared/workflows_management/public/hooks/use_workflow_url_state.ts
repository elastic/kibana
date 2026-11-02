/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import queryString from 'query-string';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  type ExecutionStatus,
  ExecutionStatusValues,
  type ExecutionType,
  ExecutionTypeValues,
  type LayoutDirection,
} from '@kbn/workflows';
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
  replayIsTestRun?: boolean;
  /** Execution-list filters. Empty lists are omitted from the URL. */
  executionStatuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  /** Row to highlight after the detail flyout closes. */
  lastViewedExecutionId?: string;
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

/** Returns the entry state with the run entry set; the same object when the run entry is unchanged. */
const withRunEntryState = (state: unknown, runEntry: RunEntryState | undefined): unknown => {
  const current = getRunEntryState(state);
  if (current?.depth === runEntry?.depth && current?.openedInApp === runEntry?.openedInApp) {
    return state;
  }
  const rest =
    state != null && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
  delete rest[RUN_ENTRY_STATE_KEY];
  if (runEntry) {
    return { ...rest, [RUN_ENTRY_STATE_KEY]: runEntry };
  }
  return Object.keys(rest).length > 0 ? rest : undefined;
};

/**
 * Normalise a `query-string` value (which may be `string | (string | null)[] | null`)
 * to `string | undefined`, taking the first element of any array.
 */
function firstString(value: string | Array<string | null> | null | undefined): string | undefined {
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value ?? undefined;
}

const MAX_URL_LIST_ITEMS = 50;
const MAX_URL_TOKEN_LENGTH = 512;

function stringList(value: string | Array<string | null> | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_URL_TOKEN_LENGTH)
    .slice(0, MAX_URL_LIST_ITEMS);
}

function knownValues<T extends string>(values: string[], allowed: readonly string[]): T[] {
  const allowedSet = new Set<string>(allowed);
  return values.filter((value): value is T => allowedSet.has(value));
}

function boundedToken(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const token = value.trim();
  return token.length > 0 && token.length <= MAX_URL_TOKEN_LENGTH ? token : undefined;
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
    replayIsTestRun: boolean;
    executionListFilters: {
      statuses: ExecutionStatus[];
      executionTypes: ExecutionType[];
      executedBy: string[];
    };
    lastViewedExecutionId: string | undefined;
  } => {
    const params = queryString.parse(location.search);
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
      replayIsTestRun: firstString(params.replayIsTestRun) === 'true',
      executionListFilters: {
        statuses: knownValues<ExecutionStatus>(
          stringList(params.executionStatuses),
          ExecutionStatusValues
        ),
        executionTypes: knownValues<ExecutionType>(
          stringList(params.executionTypes),
          ExecutionTypeValues
        ),
        executedBy: stringList(params.executedBy),
      },
      lastViewedExecutionId: boundedToken(firstString(params.lastViewedExecutionId)),
    };
  }, [location.search]);

  const updateUrlState = useCallback(
    (updates: Partial<WorkflowUrlState>, { replace = true }: WorkflowUrlUpdateOptions = {}) => {
      const currentParams = queryString.parse(history.location.search);

      // Update the params with new values
      const newParams = {
        ...currentParams,
        ...updates,
      };

      // Remove undefined/null values and empty lists to keep URL clean
      const cleanParams: Record<string, string | boolean | string[]> = {};
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        if (Array.isArray(value)) {
          const items = value.filter(
            (item): item is string => typeof item === 'string' && item.length > 0
          );
          if (items.length > 0) {
            cleanParams[key] = items;
          }
          return;
        }
        cleanParams[key] = value as string | boolean;
      });

      // Update the URL without causing a full page reload. Values must be encoded: iteration and
      // case-branch ids embed author-controlled step names and case matches, and a raw `&`, `#`
      // or `+` would split or truncate the param when the URL is parsed back.
      const newSearch = queryString.stringify(cleanParams);
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
    updateUrlState({ replayExecutionId: undefined, replayIsTestRun: undefined });
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
    replayIsTestRun: urlState.replayIsTestRun,
    executionListFilters: urlState.executionListFilters,
    lastViewedExecutionId: urlState.lastViewedExecutionId,

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
