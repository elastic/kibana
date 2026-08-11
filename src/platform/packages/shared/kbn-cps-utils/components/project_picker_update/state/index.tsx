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
} from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { useCreateStore, type ActionsFromReducers } from './store';
import { createStoreReducers } from './reducers';
import { type ProjectPickerState } from './reducers';
import { projectPickerDerivatives } from './derivatives';
import { type CPSProject } from '../../../types';
import {
  createFilterExpressionsMap,
  parseDefaultProjectRouting,
  type ProjectRoutingStrategy,
} from '../utils';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: Omit<ActionsFromReducers<ReturnType<typeof createStoreReducers>>, '_setStoreState'>;
}

export interface ProjectPickerStateProviderProps
  extends Pick<ProjectPickerState, 'isReadOnly' | 'originProjectId'> {
  children: React.ReactNode;
  availableProjects: CPSProject[];
  currentProjectRoutingGetter: () => ProjectRouting | undefined;
  defaultProjectRoutingGetter: () => ProjectRouting;
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

const createInitialPickerState = ({
  availableProjects,
  currentProjectRouting,
  defaultProjectRouting,
  isReadOnly,
  originProjectId,
  projectRoutingStrategy,
}: Pick<
  ProjectPickerState,
  | 'currentProjectRouting'
  | 'defaultProjectRouting'
  | 'isReadOnly'
  | 'originProjectId'
  | 'projectRoutingStrategy'
> & { availableProjects: CPSProject[] }): ProjectPickerState => {
  const availableProjectIds = availableProjects.map((project) => project._id);
  const parsed = parseDefaultProjectRouting(currentProjectRouting, availableProjectIds);

  return {
    isReadOnly,
    originProjectId,
    defaultProjectRouting,
    projectRoutingStrategy,
    filterExpressions: createFilterExpressionsMap(parsed.filterExpressions),
    filteringDimensions: [],
    availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
    excludedOverrides: [...parsed.excludedOverrides],
    filteredProjectIds: [],
    visibleProjectIds: [],
    selectedProjects: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
  };
};

export const ProjectPickerStateProvider = ({
  children,
  availableProjects,
  isReadOnly,
  originProjectId,
  onProjectRoutingChange,
  projectRoutingStrategy = 'dynamic',
  defaultProjectRoutingGetter,
  currentProjectRoutingGetter,
}: PropsWithChildren<ProjectPickerStateProviderProps>) => {
  const ProjectPickerContext = useMemo(() => createProjectPickerContext(), []);
  const projectPickerReducers = useMemo(() => createStoreReducers(), []);

  const store = useCreateStore<ProjectPickerState, typeof projectPickerReducers>({
    initialState: createInitialPickerState({
      availableProjects,
      currentProjectRouting: currentProjectRoutingGetter() ?? defaultProjectRoutingGetter(),
      defaultProjectRouting: defaultProjectRoutingGetter(),
      isReadOnly,
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
      isReadOnly,
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      defaultProjectRouting,
      filterExpressions: parsed.filterExpressions,
      excludedOverrides: parsed.excludedOverrides,
    });
  }, [
    availableProjects,
    currentProjectRoutingGetter,
    defaultProjectRoutingGetter,
    isReadOnly,
    store.actions,
  ]);

  useEffect(() => {
    const routing = store.state.currentProjectRouting;
    if (routing !== (currentProjectRoutingGetter() ?? '')) {
      onProjectRoutingChange(routing);
    }
  }, [store.state.currentProjectRouting, onProjectRoutingChange, currentProjectRoutingGetter]);

  return <ProjectPickerContext.Provider value={store}>{children}</ProjectPickerContext.Provider>;
};
