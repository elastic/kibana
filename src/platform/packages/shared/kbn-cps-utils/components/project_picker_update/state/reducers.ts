/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../../types';
import {
  FilterOperator,
  invertOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';
import type { ProjectRoutingStrategy } from '../utils/project_routing_codec';
import {
  createFilterExpressionsMap,
  parseDefaultProjectRouting,
  PROJECT_SELECTION_DIMENSION,
} from '../utils';
import { getEnabledFiltersIdentity } from '../utils/state_utils';
import { computeVisibleProjectIds, getIncludedVisibleProjectIds } from './derivatives';
import type { StoreReducer } from './store';

export interface FilterEntry {
  expression: FilterExpressionValue;
  enabled: boolean;
}

export type ProjectPickerControlsState = 'enabled' | 'disabled' | 'hidden';

/** A filter/selection edit that hasn't been confirmed by the server yet. */
export interface ProposedFilters {
  filterExpressions: Map<string, FilterEntry>;
  excludedOverrides: string[];
}

export interface ProjectPickerStoredState {
  controlsState: ProjectPickerControlsState;
  originProjectId?: string;
  defaultProjectRouting: ProjectRouting;
  projectRoutingStrategy: Omit<ProjectRoutingStrategy, 'unknown'>;
  /**
   * True once the user has changed filter or selection state through a public action.
   * Sticky for the lifetime of the store; internal (underscore-prefixed) reducers never set it.
   */
  hasUserModifiedRouting: boolean;
  filteringDimensions: string[];
  /**
   * Committed filter expressions. Only ever changes together with {@link ProjectPickerStoredState.excludedOverrides}
   * and {@link ProjectPickerState.filteredProjectIds}, all at once, when a proposal is confirmed (see
   * the `_commitProposedFilters` reducer) — so these three can never describe different filter
   * generations, and the list can never be derived from mismatched inputs.
   */
  filterExpressions: Map<string, FilterEntry>;
  availableProjects: Map<CPSProject['_id'], CPSProject>;
  /** Committed selection overrides — see {@link ProjectPickerStoredState.filterExpressions}. */
  excludedOverrides: string[];
  /**
   * A filter/selection edit the user has requested but that the server hasn't confirmed yet.
   * While set, {@link ProjectPickerStoredState.filterExpressions} and
   * {@link ProjectPickerStoredState.excludedOverrides} stay exactly as they were, so the
   * currently-rendered list is never recomputed from a mix of new filters and stale results.
   */
  proposedFilters: ProposedFilters | null;
}

export interface ProjectPickerState extends ProjectPickerStoredState {
  currentProjectRouting: ProjectRouting;
  isUsingSpaceDefaults: boolean;
  /**
   * Project ids that match the enabled filter expressions, from server search
   * intersected with {@link ProjectPickerStoredState.availableProjects}.
   */
  filteredProjectIds: string[];
  /**
   * True while a filter-expression server search is in flight.
   */
  isFilterSearchLoading: boolean;
  /**
   * Last filter-search error, if any. The proposal that triggered it stays pending so the
   * attempted filters remain visible alongside the error.
   */
  filterSearchError: Error | null;
  /**
   * This is the list of projects that qualify to be displayed considering the filter expressions the user has applied.
   */
  visibleProjectIds: string[];
  /**
   * This is the list of projects that currently displayed in the list, it is a subset of {@link ProjectPickerState.visibleProjectIds},
   * considering if the user has made any overrides to exclude certain projects from the list.
   */
  selectedProjectIds: string[];
  /**
   * {@link ProjectPickerStoredState.proposedFilters}' filters when a proposal is pending, otherwise the
   * committed {@link ProjectPickerStoredState.filterExpressions}. What filter chips/menus should read so
   * edits are reflected immediately, ahead of server confirmation.
   */
  displayedFilterExpressions: Map<string, FilterEntry>;
  /** True while a filter/selection edit is awaiting server confirmation. */
  isFilterProposalPending: boolean;
}

const addOverrides = (overrides: string[], projectIds: string[]): string[] => {
  return uniq([...overrides, ...projectIds]);
};

const removeOverrides = (overrides: string[], projectIds: string[]): string[] => {
  return overrides.filter((id) => !projectIds.includes(id));
};

/**
 * The filters a filter-editing reducer should build on: a pending proposal if one exists,
 * otherwise the committed filters. Lets edits stack correctly when the user changes filters
 * again before a prior proposal has been confirmed by the server.
 */
const getEffectiveFilters = (state: ProjectPickerState): ProposedFilters =>
  state.proposedFilters ?? {
    filterExpressions: state.filterExpressions,
    excludedOverrides: state.excludedOverrides,
  };

const sameProjectIdSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const bSet = new Set(b);
  return a.every((id) => bSet.has(id));
};

/**
 * Stages a candidate filter/selection edit as a proposal rather than committing it directly, so
 * {@link ProjectPickerStoredState.filterExpressions}/{@link ProjectPickerStoredState.excludedOverrides}
 * and the {@link ProjectPickerState.filteredProjectIds} search results they pair with only ever change
 * together, atomically, once the server confirms the edit (see `_commitProposedFilters`).
 *
 * When the candidate is identical to what's already committed, any pending proposal is dropped
 * instead — this is what lets a user's edit that round-trips back to the live state (e.g. toggling
 * a filter off then on again) cancel a pending, now-superseded server search instead of leaving it
 * to commit and clobber the reversal.
 */
const proposeFilters = (
  state: ProjectPickerState,
  candidate: ProposedFilters
): ProjectPickerState => {
  const matchesCommitted =
    getEnabledFiltersIdentity(candidate.filterExpressions) ===
      getEnabledFiltersIdentity(state.filterExpressions) &&
    sameProjectIdSet(candidate.excludedOverrides, state.excludedOverrides);

  if (matchesCommitted) {
    return state.proposedFilters === null ? state : { ...state, proposedFilters: null };
  }

  return { ...state, proposedFilters: candidate, filterSearchError: null };
};

/**
 * Marks the state as user-modified whenever the wrapped reducer produces a new state object.
 * No-op reducer invocations (that return the incoming state) leave the flag untouched, so
 * only genuine user edits flip {@link ProjectPickerStoredState.hasUserModifiedRouting}.
 */
const withUserInteractionMiddleware =
  <P = void>(reducer: StoreReducer<ProjectPickerState, P>): StoreReducer<ProjectPickerState, P> =>
  (state, payload) => {
    const next = reducer(state, payload);
    return next === state ? state : { ...next, hasUserModifiedRouting: true };
  };

export function createStoreReducers() {
  return {
    /**
     * This action is used to set the entire store state, it should be used sparingly.
     *
     * When the incoming (prop-driven) filters differ from what's committed, they're staged as a
     * proposal — exactly like a user-initiated filter edit — rather than committed directly, so
     * the currently-rendered list stays untouched until the server confirms the new filter set.
     */
    _setStoreState(
      state: ProjectPickerState,
      payload: Pick<ProjectPickerState, 'availableProjects'> & {
        defaultProjectRouting?: ProjectRouting;
        filterExpressions?: FilterExpressionValue[];
        excludedOverrides?: string[];
      }
    ) {
      const availableProjectIds = Array.from(payload.availableProjects.keys());
      const parsed =
        payload.filterExpressions !== undefined && payload.excludedOverrides !== undefined
          ? {
              filterExpressions: payload.filterExpressions,
              excludedOverrides: payload.excludedOverrides,
            }
          : parseDefaultProjectRouting(
              payload.defaultProjectRouting ?? state.defaultProjectRouting,
              availableProjectIds,
              state.originProjectId
            );

      const filterExpressions = createFilterExpressionsMap(parsed.filterExpressions);
      const excludedOverrides = [...parsed.excludedOverrides];

      const filtersUnchanged =
        getEnabledFiltersIdentity(state.filterExpressions) ===
          getEnabledFiltersIdentity(filterExpressions) &&
        sameProjectIdSet(excludedOverrides, state.excludedOverrides);

      const nextState = {
        ...state,
        availableProjects: payload.availableProjects,
        ...(payload.defaultProjectRouting !== undefined
          ? { defaultProjectRouting: payload.defaultProjectRouting }
          : {}),
      };

      if (filtersUnchanged) {
        return nextState;
      }

      return {
        ...nextState,
        proposedFilters: { filterExpressions, excludedOverrides },
        filterSearchError: null,
      };
    },
    /**
     * Updates only the controls-state flag, without touching any filter/selection state.
     */
    _setControlsState(
      state: ProjectPickerState,
      payload: Pick<ProjectPickerState, 'controlsState'>
    ) {
      if (state.controlsState === payload.controlsState) {
        return state;
      }

      return {
        ...state,
        controlsState: payload.controlsState,
      };
    },
    /**
     * Updates only the routing-strategy flag, without touching any filter/selection state.
     * Internal: a strategy switch is prop-driven, not a user edit, so it must not flip
     * {@link ProjectPickerStoredState.hasUserModifiedRouting}.
     */
    _setProjectRoutingStrategy(
      state: ProjectPickerState,
      payload: Pick<ProjectPickerState, 'projectRoutingStrategy'>
    ) {
      if (state.projectRoutingStrategy === payload.projectRoutingStrategy) {
        return state;
      }

      return {
        ...state,
        projectRoutingStrategy: payload.projectRoutingStrategy,
      };
    },
    /**
     * Confirms the pending proposal: the proposed filters/overrides and the search results they
     * were fetched for replace the committed ones together, in a single state update, and the
     * proposal is cleared. No-op if there is no pending proposal.
     */
    _commitProposedFilters(state: ProjectPickerState, payload: { filteredProjectIds: string[] }) {
      if (!state.proposedFilters) {
        return state;
      }

      return {
        ...state,
        filterExpressions: state.proposedFilters.filterExpressions,
        excludedOverrides: state.proposedFilters.excludedOverrides,
        filteredProjectIds: payload.filteredProjectIds,
        proposedFilters: null,
        filterSearchError: null,
        isFilterSearchLoading: false,
      };
    },
    /**
     * Marks the pending proposal's server search as in flight.
     */
    _setFilterSearchLoading(state: ProjectPickerState) {
      if (state.isFilterSearchLoading && state.filterSearchError === null) {
        return state;
      }

      return { ...state, isFilterSearchLoading: true, filterSearchError: null };
    },
    /**
     * Records that the pending proposal's server search failed. The proposal itself is left
     * intact so the attempted filters stay visible alongside the error.
     */
    _setFilterSearchError(state: ProjectPickerState, payload: { error: Error }) {
      return { ...state, filterSearchError: payload.error, isFilterSearchLoading: false };
    },
    /**
     * Adds a new filter expression.
     */
    addFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { expression: FilterExpressionValue }) => {
        if (payload.expression.tagName === PROJECT_SELECTION_DIMENSION) {
          return state;
        }

        const base = getEffectiveFilters(state);
        const id = getFilterExpressionLookupKey(payload.expression);
        if (base.filterExpressions.has(id)) {
          return state;
        }

        const filterExpressions = new Map(base.filterExpressions);
        filterExpressions.set(id, { expression: payload.expression, enabled: true });

        return proposeFilters(state, {
          filterExpressions,
          excludedOverrides: base.excludedOverrides,
        });
      }
    ),
    /**
     * Updates the definition of an existing filter expression in-place.
     */
    updateFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { id: string; expression: FilterExpressionValue }) => {
        if (payload.expression.tagName === PROJECT_SELECTION_DIMENSION) {
          return state;
        }

        const base = getEffectiveFilters(state);
        const existing = base.filterExpressions.get(payload.id);
        if (!existing) {
          return state;
        }

        const nextKey = getFilterExpressionLookupKey(payload.expression);
        if (nextKey !== payload.id && base.filterExpressions.has(nextKey)) {
          return state;
        }

        const filterExpressions = new Map(base.filterExpressions);

        if (nextKey !== payload.id) {
          filterExpressions.delete(payload.id);
        }

        filterExpressions.set(nextKey, { ...existing, expression: payload.expression });

        return proposeFilters(state, {
          filterExpressions,
          excludedOverrides: base.excludedOverrides,
        });
      }
    ),
    /**
     * Removes the filter expression.
     */
    removeFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
        const base = getEffectiveFilters(state);
        const filterExpressions = new Map(base.filterExpressions);
        filterExpressions.delete(payload.filterId);

        return proposeFilters(state, {
          filterExpressions,
          excludedOverrides: base.excludedOverrides,
        });
      }
    ),
    /**
     * Toggles the enabled state of the filter expression.
     */
    toggleFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
        const base = getEffectiveFilters(state);
        const filterExpressions = new Map(base.filterExpressions);
        const existing = filterExpressions.get(payload.filterId);

        if (!existing) {
          return state;
        }

        filterExpressions.set(payload.filterId, { ...existing, enabled: !existing.enabled });

        return proposeFilters(state, {
          filterExpressions,
          excludedOverrides: base.excludedOverrides,
        });
      }
    ),
    /**
     * Inverts the operator of the filter expression.
     */
    invertFilterExpressionOperator: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
        const base = getEffectiveFilters(state);
        const filterExpressions = new Map(base.filterExpressions);
        const existing = filterExpressions.get(payload.filterId);

        if (!existing) {
          return state;
        }

        let inverted: FilterExpressionValue;

        // this switch is necessary as a type narrowing mechanism
        switch (existing.expression.operator) {
          case FilterOperator.EQUALS:
          case FilterOperator.NOT_EQUALS:
            inverted = {
              ...existing.expression,
              operator: invertOperator(existing.expression.operator),
            };
            break;
          case FilterOperator.ONE_OF:
          case FilterOperator.NOT_ONE_OF:
            inverted = {
              ...existing.expression,
              operator: invertOperator(existing.expression.operator),
            };
            break;
          case FilterOperator.EXISTS:
          case FilterOperator.NOT_EXISTS:
            inverted = {
              ...existing.expression,
              operator: invertOperator(existing.expression.operator),
            };
            break;
          default:
            return state;
        }

        const nextKey = getFilterExpressionLookupKey(inverted);
        if (nextKey !== payload.filterId && filterExpressions.has(nextKey)) {
          return state;
        }

        if (nextKey !== payload.filterId) {
          filterExpressions.delete(payload.filterId);
        }
        filterExpressions.set(nextKey, {
          ...existing,
          expression: inverted,
        });

        return proposeFilters(state, {
          filterExpressions,
          excludedOverrides: base.excludedOverrides,
        });
      }
    ),
    /**
     * Clears all filter expressions.
     */
    clearProjectFilters: withUserInteractionMiddleware((state: ProjectPickerState) => {
      const base = getEffectiveFilters(state);
      if (base.filterExpressions.size === 0) {
        return state;
      }

      return proposeFilters(state, {
        filterExpressions: new Map<string, FilterEntry>(),
        excludedOverrides: base.excludedOverrides,
      });
    }),
    /**
     * Excludes the provided project ids from the selected projects list.
     */
    excludeSelectedProjects: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { projects: string[] }) => {
        const includedVisible = getIncludedVisibleProjectIds(state);
        const toExclude = payload.projects.filter((id) => includedVisible.includes(id));
        if (includedVisible.length - toExclude.length < 1) {
          return state;
        }

        return {
          ...state,
          excludedOverrides: addOverrides(state.excludedOverrides, payload.projects),
        };
      }
    ),
    /**
     * Undo the exclusion of the provided project ids from the selected projects list.
     */
    undoProjectExclusion: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { projects: string[] }) => ({
        ...state,
        excludedOverrides: removeOverrides(state.excludedOverrides, payload.projects),
      })
    ),
    revertToSpaceDefaults: withUserInteractionMiddleware((state: ProjectPickerState) => {
      const parsed = parseDefaultProjectRouting(
        state.defaultProjectRouting,
        Array.from(state.availableProjects.keys()),
        state.originProjectId
      );

      return proposeFilters(state, {
        filterExpressions: createFilterExpressionsMap(parsed.filterExpressions),
        excludedOverrides: [...parsed.excludedOverrides],
      });
    }),
    /**
     * Includes all visible projects.
     */
    includeAllVisibleProjects: withUserInteractionMiddleware((state: ProjectPickerState) => ({
      ...state,
      excludedOverrides: removeOverrides(state.excludedOverrides, computeVisibleProjectIds(state)),
    })),
    /**
     * Sets the provided project id as the only project to be included, excluding all other projects.
     */
    includeOnlyProvidedProjectId: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { anchorProjectId: string }) => {
        const visibleProjectIds = computeVisibleProjectIds(state);
        if (!visibleProjectIds.includes(payload.anchorProjectId)) {
          return state;
        }

        const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);
        const nextExcludedOverrides = removeOverrides(
          addOverrides(state.excludedOverrides, otherVisibleIds),
          [payload.anchorProjectId]
        );

        if (
          nextExcludedOverrides.length === state.excludedOverrides.length &&
          nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
        ) {
          return state;
        }

        return { ...state, excludedOverrides: nextExcludedOverrides };
      }
    ),
    /**
     * Excludes the provided project id, set all other projects as included.
     */
    excludeOnlyProvidedProjectId: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { anchorProjectId: string }) => {
        const visibleProjectIds = computeVisibleProjectIds(state);
        if (!visibleProjectIds.includes(payload.anchorProjectId)) {
          return state;
        }

        const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);
        const nextExcludedOverrides = removeOverrides(
          addOverrides(state.excludedOverrides, [payload.anchorProjectId]),
          otherVisibleIds
        );

        if (
          nextExcludedOverrides.length === state.excludedOverrides.length &&
          nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
        ) {
          return state;
        }

        return { ...state, excludedOverrides: nextExcludedOverrides };
      }
    ),
  } as const;
}
