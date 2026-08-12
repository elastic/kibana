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
import {
  createFilterExpressionsMap,
  parseDefaultProjectRouting,
  type ProjectRoutingStrategy,
} from '../utils';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: Omit<
    ActionsFromReducers<ReturnType<typeof createStoreReducers>>,
    '_setStoreState' | '_setFilterSearchResult' | '_setControlsState'
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
  projectRoutingStrategy?: ProjectRoutingStrategy;
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

const createInitialPickerState = ({
  availableProjects,
  currentProjectRouting,
  defaultProjectRouting,
  controlsState,
  originProjectId,
  projectRoutingStrategy,
}: Pick<
  ProjectPickerState,
  | 'currentProjectRouting'
  | 'defaultProjectRouting'
  | 'controlsState'
  | 'originProjectId'
  | 'projectRoutingStrategy'
> & { availableProjects: CPSProject[] }): ProjectPickerState => {
  const availableProjectIds = availableProjects.map((project) => project._id);
  const parsed = parseDefaultProjectRouting(currentProjectRouting, availableProjectIds);

  return {
    controlsState,
    originProjectId,
    defaultProjectRouting,
    projectRoutingStrategy,
    filterExpressions: createFilterExpressionsMap(parsed.filterExpressions),
    filteringDimensions: [],
    availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
    excludedOverrides: [...parsed.excludedOverrides],
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjectIds: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
  };
};

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
      currentProjectRouting: currentProjectRoutingGetter() ?? defaultProjectRoutingGetter(),
      defaultProjectRouting: defaultProjectRoutingGetter(),
      controlsState,
      originProjectId,
      projectRoutingStrategy,
    }),
    reducers: projectPickerReducers,
    derivatives: [...projectPickerDerivatives],
  });

  useEffect(() => {
    const currentProjectRouting = currentProjectRoutingGetter() ?? '';
    const defaultProjectRouting = defaultProjectRoutingGetter() ?? '';
    const parsed = parseDefaultProjectRouting(
      currentProjectRouting || defaultProjectRouting,
      availableProjects.map((project) => project._id)
    );

    store.actions._setStoreState({
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      defaultProjectRouting,
      filterExpressions: parsed.filterExpressions,
      excludedOverrides: parsed.excludedOverrides,
    });
  }, [availableProjects, currentProjectRoutingGetter, defaultProjectRoutingGetter, store.actions]);

  useEffect(() => {
    store.actions._setControlsState({ controlsState });
  }, [controlsState, store.actions]);

  const enabledFiltersIdentity = getEnabledFiltersIdentity(store.state.filterExpressions);

  const runFilterSearch = useCallback(
    async (filterIdentity: string, availableProjectsMap: Map<string, CPSProject>) => {
      filterFetchAbortRef.current?.abort();
      const abortController = new AbortController();
      filterFetchAbortRef.current = abortController;

      if (!filterIdentity) {
        store.actions._setFilterSearchResult({
          filteredProjectIds: [],
          isFilterSearchLoading: false,
          filterSearchError: null,
        });
        return;
      }

      store.actions._setFilterSearchResult({
        isFilterSearchLoading: true,
        filterSearchError: null,
      });

      try {
        const data = await fetchProjectsByRoutingRef.current(filterIdentity);
        if (abortController.signal.aborted) {
          return;
        }

        const serverIds = collectProjectIdsFromProjectsData(data);
        const filteredProjectIds = intersectServerMatchIds(availableProjectsMap, serverIds);

        store.actions._setFilterSearchResult({
          filteredProjectIds,
          isFilterSearchLoading: false,
          filterSearchError: null,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        store.actions._setFilterSearchResult({
          isFilterSearchLoading: false,
          filterSearchError: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    [store.actions]
  );

  useEffect(() => {
    const availableProjectsMap = new Map(
      availableProjects.map((project) => [project._id, project])
    );
    void runFilterSearch(enabledFiltersIdentity, availableProjectsMap);

    return () => {
      filterFetchAbortRef.current?.abort();
    };
  }, [enabledFiltersIdentity, availableProjects, runFilterSearch]);

  useEffect(() => {
    const routing = store.state.currentProjectRouting;
    if (routing !== (currentProjectRoutingGetter() ?? '')) {
      onProjectRoutingChange(routing);
    }
  }, [store.state.currentProjectRouting, onProjectRoutingChange, currentProjectRoutingGetter]);

  const contextValue = useMemo((): ProjectPickerContext => {
    const { _setStoreState, _setFilterSearchResult, _setControlsState, ...publicActions } =
      store.actions;

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
