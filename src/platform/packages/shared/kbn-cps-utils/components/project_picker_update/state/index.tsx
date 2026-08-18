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
import { PROJECT_ROUTING } from '@kbn/cps-common';
import { useCreateStore, type ActionsFromReducers } from './store';
import {
  createStoreReducers,
  createFilterExpressionsMap,
  getProjectRoutingState,
} from './reducers';
import { type ProjectPickerState } from './reducers';
import { projectPickerDerivatives } from './derivatives';
import { type CPSProject } from '../../../types';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: Omit<ActionsFromReducers<ReturnType<typeof createStoreReducers>>, '_setStoreState'>;
}

export interface ProjectPickerStateProviderProps extends Pick<ProjectPickerState, 'isReadOnly'> {
  children: React.ReactNode;
  availableProjects: CPSProject[];
  defaultProjectRouting?: ProjectRouting;
  initialProjectRouting?: ProjectRouting;
  originProjectId?: string;
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

export const ProjectPickerStateProvider = ({
  children,
  availableProjects,
  defaultProjectRouting = PROJECT_ROUTING.ALL,
  initialProjectRouting,
  isReadOnly,
  originProjectId,
}: PropsWithChildren<ProjectPickerStateProviderProps>) => {
  const ProjectPickerContext = useMemo(() => createProjectPickerContext(), []);
  const projectPickerReducers = useMemo(() => createStoreReducers(), []);
  const { excludedProjectIds, filterExpressions } = useMemo(
    () =>
      getProjectRoutingState({
        availableProjects,
        originProjectId,
        projectRouting: initialProjectRouting,
      }),
    [availableProjects, initialProjectRouting, originProjectId]
  );

  const store = useCreateStore<ProjectPickerState, typeof projectPickerReducers>({
    initialState: {
      isReadOnly,
      hasUserModifiedRouting: false,
      defaultProjectRouting,
      originProjectId,
      filterExpressions: createFilterExpressionsMap(filterExpressions),
      filteringDimensions: [],
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      excludedOverrides: excludedProjectIds,
      filteredProjectIds: [],
      visibleProjectIds: [],
      selectedProjects: [],
    },
    reducers: projectPickerReducers,
    derivatives: [...projectPickerDerivatives],
  });

  useEffect(() => {
    store.actions._setStoreState({
      isReadOnly,
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      defaultProjectRouting,
      excludedOverrides: excludedProjectIds,
      filterExpressions,
      originProjectId,
    });
  }, [
    availableProjects,
    defaultProjectRouting,
    excludedProjectIds,
    filterExpressions,
    isReadOnly,
    originProjectId,
    store.actions,
  ]);

  return <ProjectPickerContext.Provider value={store}>{children}</ProjectPickerContext.Provider>;
};
