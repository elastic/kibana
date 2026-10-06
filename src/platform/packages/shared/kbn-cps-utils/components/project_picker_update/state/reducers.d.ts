/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../../types';
import { type FilterExpressionValue } from '../utils/filter_input_codec';
import type { ProjectRoutingStrategy } from '../utils/project_routing_codec';
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
export declare function createStoreReducers(): {
  /**
   * This action is used to set the entire store state, it should be used sparingly.
   *
   * When the incoming (prop-driven) filters differ from what's committed, they're staged as a
   * proposal — exactly like a user-initiated filter edit — rather than committed directly, so
   * the currently-rendered list stays untouched until the server confirms the new filter set.
   */
  readonly _setStoreState: (
    state: ProjectPickerState,
    payload: Pick<ProjectPickerState, 'availableProjects'> & {
      defaultProjectRouting?: ProjectRouting;
      filterExpressions?: FilterExpressionValue[];
      excludedOverrides?: string[];
    }
  ) => {
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
    /** Committed selection overrides — see {@link ProjectPickerStoredState.filterExpressions}. */
    excludedOverrides: string[];
    /**
     * A filter/selection edit the user has requested but that the server hasn't confirmed yet.
     * While set, {@link ProjectPickerStoredState.filterExpressions} and
     * {@link ProjectPickerStoredState.excludedOverrides} stay exactly as they were, so the
     * currently-rendered list is never recomputed from a mix of new filters and stale results.
     */
    proposedFilters: ProposedFilters | null;
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
    availableProjects: Map<string, CPSProject>;
  };
  /**
   * Updates only the controls-state flag, without touching any filter/selection state.
   */
  readonly _setControlsState: (
    state: ProjectPickerState,
    payload: Pick<ProjectPickerState, 'controlsState'>
  ) => ProjectPickerState;
  /**
   * Updates only the routing-strategy flag, without touching any filter/selection state.
   * Internal: a strategy switch is prop-driven, not a user edit, so it must not flip
   * {@link ProjectPickerStoredState.hasUserModifiedRouting}.
   */
  readonly _setProjectRoutingStrategy: (
    state: ProjectPickerState,
    payload: Pick<ProjectPickerState, 'projectRoutingStrategy'>
  ) => ProjectPickerState;
  /**
   * Confirms the pending proposal: the proposed filters/overrides and the search results they
   * were fetched for replace the committed ones together, in a single state update, and the
   * proposal is cleared. No-op if there is no pending proposal.
   */
  readonly _commitProposedFilters: (
    state: ProjectPickerState,
    payload: {
      filteredProjectIds: string[];
    }
  ) => ProjectPickerState;
  /**
   * Marks the pending proposal's server search as in flight.
   */
  readonly _setFilterSearchLoading: (state: ProjectPickerState) => ProjectPickerState;
  /**
   * Records that the pending proposal's server search failed. The proposal itself is left
   * intact so the attempted filters stay visible alongside the error.
   */
  readonly _setFilterSearchError: (
    state: ProjectPickerState,
    payload: {
      error: Error;
    }
  ) => {
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
    currentProjectRouting: ProjectRouting;
    isUsingSpaceDefaults: boolean;
    /**
     * Project ids that match the enabled filter expressions, from server search
     * intersected with {@link ProjectPickerStoredState.availableProjects}.
     */
    filteredProjectIds: string[];
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
    filterSearchError: Error;
    isFilterSearchLoading: boolean;
  };
  /**
   * Adds a new filter expression.
   */
  readonly addFilterExpression: StoreReducer<
    ProjectPickerState,
    {
      expression: FilterExpressionValue;
    }
  >;
  /**
   * Updates the definition of an existing filter expression in-place.
   */
  readonly updateFilterExpression: StoreReducer<
    ProjectPickerState,
    {
      id: string;
      expression: FilterExpressionValue;
    }
  >;
  /**
   * Removes the filter expression.
   */
  readonly removeFilterExpression: StoreReducer<
    ProjectPickerState,
    {
      filterId: string;
    }
  >;
  /**
   * Toggles the enabled state of the filter expression.
   */
  readonly toggleFilterExpression: StoreReducer<
    ProjectPickerState,
    {
      filterId: string;
    }
  >;
  /**
   * Inverts the operator of the filter expression.
   */
  readonly invertFilterExpressionOperator: StoreReducer<
    ProjectPickerState,
    {
      filterId: string;
    }
  >;
  /**
   * Clears all filter expressions.
   */
  readonly clearProjectFilters: StoreReducer<ProjectPickerState, void>;
  /**
   * Excludes the provided project ids from the selected projects list.
   */
  readonly excludeSelectedProjects: StoreReducer<
    ProjectPickerState,
    {
      projects: string[];
    }
  >;
  /**
   * Undo the exclusion of the provided project ids from the selected projects list.
   */
  readonly undoProjectExclusion: StoreReducer<
    ProjectPickerState,
    {
      projects: string[];
    }
  >;
  readonly revertToSpaceDefaults: StoreReducer<ProjectPickerState, void>;
  /**
   * Includes all visible projects.
   */
  readonly includeAllVisibleProjects: StoreReducer<ProjectPickerState, void>;
  /**
   * Sets the provided project id as the only project to be included, excluding all other projects.
   */
  readonly includeOnlyProvidedProjectId: StoreReducer<
    ProjectPickerState,
    {
      anchorProjectId: string;
    }
  >;
  /**
   * Excludes the provided project id, set all other projects as included.
   */
  readonly excludeOnlyProvidedProjectId: StoreReducer<
    ProjectPickerState,
    {
      anchorProjectId: string;
    }
  >;
};
