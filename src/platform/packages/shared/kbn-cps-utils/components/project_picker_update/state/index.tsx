/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import React, {
  useMemo,
  useContext,
  createContext,
  type PropsWithChildren,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { useCreateStore, type ActionsFromReducers } from './store';
import { createStoreReducers } from './reducers';
import { type ProjectPickerState } from './reducers';
import { projectPickerDerivatives } from './derivatives';
import {
  collectProjectIdsFromProjectsData,
  getEnabledFiltersIdentity,
  intersectServerMatchIds,
} from '../utils/state_utils';
import { type CPSProject, type ProjectsData } from '../../../types';
import { parseDefaultProjectRouting, type ProjectRoutingStrategy } from '../utils';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: Omit<
    ActionsFromReducers<ReturnType<typeof createStoreReducers>>,
    | '_setStoreState'
    | '_setControlsState'
    | '_setProjectRoutingStrategy'
    | '_commitProposedFilters'
    | '_setFilterSearchLoading'
    | '_setFilterSearchError'
  >;
  fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}

export interface ProjectPickerStateProviderProps
  extends Pick<ProjectPickerState, 'originProjectId'> {
  children: React.ReactNode;
  /**
   * Controls if the control button for toggling the project routing picker.
   * @default 'enabled'
   *
   * - `enabled`: shown and interactive
   * - `disabled`: shown but not interactive
   * - `hidden`: not rendered, leaving a read-only project list
   */
  controlsState?: ProjectPickerState['controlsState'];
  availableProjects: CPSProject[];
  /**
   * Returns the app's current project routing. Contract: the returned value must reflect
   * routings previously delivered via {@link ProjectPickerStateProviderProps.onProjectRoutingChange}
   * (i.e. the consumer round-trips reported values back into this getter).
   */
  currentProjectRoutingGetter: () => ProjectRouting | undefined;
  defaultProjectRoutingGetter: () => ProjectRouting;
  /**
   * Fetches projects matching a project routing expression. Used for filter-expression
   * server search; must not be used for exclusion-only changes.
   */
  fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
  /**
   * Controls how project IDs are encoded into the routing string.
   *
   * - `dynamic` (default): `_id:*` with exclusions. Filter rules stay live;
   *   newly linked projects can match without re-saving.
   * - `snapshot`: explicit `_id:…` clauses for each selected project.
   *   Resulting in a routing query that is frozen to the current selection. Having this is useful in configuring space defaults.
   *
   * @default 'dynamic'
   */
  projectRoutingStrategy?: Omit<ProjectRoutingStrategy, 'unknown'>;
  /**
   * Callback function invoked with the project routing string when the project selection changes
   */
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}

export const createProjectPickerContext = once(() =>
  createContext<ProjectPickerContext | null>(null)
);

export const useProjectPickerContext = () => {
  const context = useContext(createProjectPickerContext());
  if (!context) {
    throw new Error('useProjectPickerContext must be used within a ProjectPickerProvider');
  }
  return context;
};

export const useProjectPickerActions = () => {
  const ctx = useProjectPickerContext();
  return ctx.actions;
};

export const useProjectPickerState = () => {
  const ctx = useProjectPickerContext();
  return ctx.state;
};

export const useFetchProjectsByRouting = () => {
  const ctx = useProjectPickerContext();
  return ctx.fetchProjectsByRouting;
};

/**
 * Builds the store's pre-mount state. Committed `filterExpressions`/`excludedOverrides` start
 * empty — matching the also-empty `filteredProjectIds` — rather than being parsed eagerly from
 * the incoming routing: that parsing (and the resulting proposal/search/commit) is instead
 * driven by the mount `_setStoreState` effect below, so the initial routing is bootstrapped
 * through the exact same propose-then-commit pipeline as any later prop-driven change.
 */
const createInitialPickerState = ({
  availableProjects,
  defaultProjectRouting,
  controlsState,
  originProjectId,
  projectRoutingStrategy,
}: Pick<
  ProjectPickerState,
  'defaultProjectRouting' | 'controlsState' | 'originProjectId' | 'projectRoutingStrategy'
> & { availableProjects: CPSProject[] }): ProjectPickerState => ({
  controlsState,
  originProjectId,
  defaultProjectRouting,
  projectRoutingStrategy,
  hasUserModifiedRouting: false,
  filterExpressions: new Map(),
  filteringDimensions: [],
  availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
  excludedOverrides: [],
  proposedFilters: null,
  filteredProjectIds: [],
  isFilterSearchLoading: false,
  filterSearchError: null,
  visibleProjectIds: [],
  selectedProjectIds: [],
  currentProjectRouting: '',
  isUsingSpaceDefaults: false,
  displayedFilterExpressions: new Map(),
  isFilterProposalPending: false,
});

export const ProjectPickerStateProvider = ({
  children,
  availableProjects,
  controlsState = 'enabled' as const,
  originProjectId,
  onProjectRoutingChange,
  projectRoutingStrategy = 'dynamic',
  defaultProjectRoutingGetter,
  currentProjectRoutingGetter,
  fetchProjectsByRouting,
}: PropsWithChildren<ProjectPickerStateProviderProps>) => {
  const ProjectPickerContext = useMemo(() => createProjectPickerContext(), []);
  const projectPickerReducers = useMemo(() => createStoreReducers(), []);
  const filterFetchAbortRef = useRef<AbortController | null>(null);
  const fetchProjectsByRoutingRef = useRef(fetchProjectsByRouting);
  fetchProjectsByRoutingRef.current = fetchProjectsByRouting;

  const store = useCreateStore<ProjectPickerState, typeof projectPickerReducers>({
    initialState: createInitialPickerState({
      availableProjects,
      defaultProjectRouting: defaultProjectRoutingGetter(),
      controlsState,
      originProjectId,
      projectRoutingStrategy,
    }),
    reducers: projectPickerReducers,
    derivatives: [...projectPickerDerivatives],
  });

  useEffect(() => {
    const defaultProjectRouting = defaultProjectRoutingGetter() ?? '';
    const currentProjectRouting = currentProjectRoutingGetter() || defaultProjectRouting;
    const parsed = parseDefaultProjectRouting(
      currentProjectRouting,
      availableProjects.map((project) => project._id),
      originProjectId
    );

    store.actions._setStoreState({
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      defaultProjectRouting,
      filterExpressions: parsed.filterExpressions,
      excludedOverrides: parsed.excludedOverrides,
    });
  }, [
    availableProjects,
    currentProjectRoutingGetter,
    defaultProjectRoutingGetter,
    originProjectId,
    store.actions,
  ]);

  useEffect(() => {
    store.actions._setControlsState({ controlsState });
  }, [controlsState, store.actions]);

  useEffect(() => {
    store.actions._setProjectRoutingStrategy({ projectRoutingStrategy });
  }, [projectRoutingStrategy, store.actions]);

  // The identity of the pending proposal's enabled filters, or null when there is no proposal
  // to resolve. Search re-runs are keyed off this rather than off `proposedFilters` itself, so
  // a proposal that changes only `excludedOverrides` (no re-fetch needed) doesn't refire it —
  // whichever proposal is live when an in-flight fetch for a given identity resolves is the one
  // that gets committed, since `_commitProposedFilters` always reads the latest `proposedFilters`.
  const proposedFiltersIdentity = store.state.proposedFilters
    ? getEnabledFiltersIdentity(store.state.proposedFilters.filterExpressions)
    : null;

  const runFilterSearch = useCallback(
    async (filterIdentity: string, availableProjectsMap: Map<string, CPSProject>) => {
      filterFetchAbortRef.current?.abort();
      const abortController = new AbortController();
      filterFetchAbortRef.current = abortController;

      if (!filterIdentity) {
        store.actions._commitProposedFilters({ filteredProjectIds: [] });
        return;
      }

      store.actions._setFilterSearchLoading();

      try {
        const data = await fetchProjectsByRoutingRef.current(filterIdentity);
        if (abortController.signal.aborted) {
          return;
        }

        const serverIds = collectProjectIdsFromProjectsData(data);
        const filteredProjectIds = intersectServerMatchIds(availableProjectsMap, serverIds);

        store.actions._commitProposedFilters({ filteredProjectIds });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        store.actions._setFilterSearchError({
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    [store.actions]
  );

  useEffect(() => {
    if (proposedFiltersIdentity === null) {
      return;
    }

    const availableProjectsMap = new Map(
      availableProjects.map((project) => [project._id, project])
    );
    void runFilterSearch(proposedFiltersIdentity, availableProjectsMap);

    return () => {
      filterFetchAbortRef.current?.abort();
    };
  }, [proposedFiltersIdentity, availableProjects, runFilterSearch]);

  useEffect(() => {
    // When the state is semantically back on the space defaults (e.g. after a revert), report
    // the default routing string verbatim: re-encoding is not string-stable (the `snapshot`
    // strategy in particular expands the selection into an explicit `_id:…` enumeration), and
    // the app should land back on the actual default value rather than an equivalent rewrite.
    const routing = store.state.isUsingSpaceDefaults
      ? store.state.defaultProjectRouting
      : store.state.currentProjectRouting;

    // Only report routing changes that originate from user edits, once any pending proposal has
    // been confirmed or has failed — never rewrite the incoming routing on mount, even when it
    // was encoded with a different strategy than the configured one. Gating on `proposedFilters`
    // (rather than just the in-flight loading flag) also means a routing computed from
    // pre-proposal selection/results is never reported while a newer filter set is still pending.
    if (
      store.state.hasUserModifiedRouting &&
      store.state.proposedFilters === null &&
      routing !== (currentProjectRoutingGetter() ?? '') &&
      store.state.controlsState === 'enabled'
    ) {
      onProjectRoutingChange(routing);
    }
  }, [
    store.state.currentProjectRouting,
    store.state.isUsingSpaceDefaults,
    store.state.defaultProjectRouting,
    onProjectRoutingChange,
    currentProjectRoutingGetter,
    store.state.controlsState,
    store.state.hasUserModifiedRouting,
    store.state.proposedFilters,
  ]);

  const contextValue = useMemo((): ProjectPickerContext => {
    const {
      _setStoreState,
      _setControlsState,
      _setProjectRoutingStrategy,
      _commitProposedFilters,
      _setFilterSearchLoading,
      _setFilterSearchError,
      ...publicActions
    } = store.actions;

    return {
      state: store.state,
      actions: publicActions,
      fetchProjectsByRouting,
    };
  }, [store.state, store.actions, fetchProjectsByRouting]);

  return (
    <ProjectPickerContext.Provider value={contextValue}>{children}</ProjectPickerContext.Provider>
  );
};
