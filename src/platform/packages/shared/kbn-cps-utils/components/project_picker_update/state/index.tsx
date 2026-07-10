/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import React, { useMemo, useContext, createContext, type PropsWithChildren } from 'react';
import { useCreateStore, type ActionsFromReducers } from './store';
import { createStoreReducers } from './reducers';
import { type ProjectPickerState } from './reducers';
import { projectPickerDerivatives } from './derivatives';
import { type CPSProject } from '../../../types';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: ActionsFromReducers<ReturnType<typeof createStoreReducers>>;
}

export interface ProjectPickerProviderProps {
  children: React.ReactNode;
  availableProjects: Array<CPSProject>;
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

export const ProjectPickerProvider = ({
  children,
  availableProjects,
}: PropsWithChildren<ProjectPickerProviderProps>) => {
  const ProjectPickerContext = useMemo(() => createProjectPickerContext(), []);
  const projectPickerReducers = useMemo(() => createStoreReducers(), []);

  const store = useCreateStore<ProjectPickerState, typeof projectPickerReducers>({
    initialState: {
      filterExpression: [],
      availableProjects: new Map(availableProjects.map((project) => [project._id, project])),
      includedOverrides: [],
      excludedOverrides: [],
      filteredProjectIds: [],
      selectedProjects: [],
    },
    reducers: projectPickerReducers,
    derivatives: [...projectPickerDerivatives],
  });

  return <ProjectPickerContext.Provider value={store}>{children}</ProjectPickerContext.Provider>;
};
