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
import { createStoreReducers } from './reducers';
import { type ProjectPickerState } from './reducers';
import { projectPickerDerivatives } from './derivatives';
import { type CPSProject } from '../../../types';
import { getFilterExpressionLookupKey } from '../utils/filter_input_codec';
import { type ProjectRoutingExpression, projectRoutingCodec, ROUTING_WILDCARD } from '../utils/project_routing_codec';

interface ProjectPickerContext {
  state: ProjectPickerState;
  actions: Omit<ActionsFromReducers<ReturnType<typeof createStoreReducers>>, '_setStoreState'>;
}

export interface ProjectPickerStateProviderProps extends Pick<ProjectPickerState, 'isReadOnly'> {
  children: React.ReactNode;
  availableProjects: CPSProject[];
  initialProjectRouting?: ProjectRouting;
  originProjectId: string;
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
  projectRoutingStrategy?: 'dynamic' | 'snapshot';
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

const getInitialStateFromProjectRouting = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting?: ProjectRouting;
}): Pick<ProjectRoutingExpression, 'filterExpressions' | 'excludedProjectIds'> => {
  const allProjectIds = availableProjects.map((project) => project._id);

  if (projectRouting === undefined || projectRouting === PROJECT_ROUTING.ALL) {
    return {
      filterExpressions: [],
      excludedProjectIds: [],
    };
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return {
      filterExpressions: [],
      excludedProjectIds: originProjectId
        ? allProjectIds.filter((projectId) => projectId !== originProjectId)
        : [],
    };
  }

  const { excludedProjectIds, filterExpressions, selectedProjectIds } =
    projectRoutingCodec.decode(projectRouting);

  if (selectedProjectIds.length > 0) {
    const selectedProjectIdsSet = new Set(
      selectedProjectIds.filter((projectId) =>
        availableProjects.some((project) => project._id === projectId)
      )
    );

    return {
      filterExpressions,
      excludedProjectIds: allProjectIds.filter(
        (projectId) => !selectedProjectIdsSet.has(projectId)
      ),
    };
  }

  return {
    filterExpressions,
    excludedProjectIds: excludedProjectIds.filter((projectId) =>
      availableProjects.some((project) => project._id === projectId)
    ),
  };
};

export const ProjectPickerStateProvider = ({
  children,
  availableProjects,
  initialProjectRouting,
  isReadOnly,
  originProjectId,
  onProjectRoutingChange,
  projectRoutingStrategy = 'dynamic',
  defaultProjectRoutingGetter,
}: PropsWithChildren<ProjectPickerStateProviderProps>) => {
  const ProjectPickerContext = useMemo(() => createProjectPickerContext(), []);
  const projectPickerReducers = useMemo(() => createStoreReducers(), []);
  const { excludedProjectIds, filterExpressions } = useMemo(
    () =>
      getInitialStateFromProjectRouting({
        availableProjects,
        originProjectId,
        projectRouting: initialProjectRouting,
      }),
    [availableProjects, initialProjectRouting, originProjectId]
  );

  const store = useCreateStore<ProjectPickerState, typeof projectPickerReducers>({
    initialState: {
      isReadOnly,
      filterExpressions: new Map(
        filterExpressions.map((expression) => [
          getFilterExpressionLookupKey(expression),
          { expression, enabled: true },
        ])
      ),
      originProjectId,
      defaultProjectRouting: defaultProjectRoutingGetter(),
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
      excludedOverrides: excludedProjectIds,
      filterExpressions,
    });
  }, [availableProjects, excludedProjectIds, filterExpressions, isReadOnly, store.actions]);

  useEffect(() => {
    onProjectRoutingChange(
      Array.from(store.state.filterExpressions.values())
        .map((filterEntry) =>
          filterEntry.enabled ? projectRoutingCodec.encode(filterEntry.expression) : null
        )
        .concat(
          projectRoutingStrategy === 'dynamic'
            ? [
                `_id:${ROUTING_WILDCARD}`,
                store.state.excludedOverrides.map((override) => `NOT _id:${override}`),
              ].flat()
            : store.state.selectedProjects.map((id) => `_id:${id}`)
        )
        .filter(Boolean)
        .join(' AND ')
    );
  }, [
    store.state.filterExpressions,
    store.state.selectedProjects,
    store.state.excludedOverrides,
    onProjectRoutingChange,
    projectRoutingStrategy,
  ]);

  return <ProjectPickerContext.Provider value={store}>{children}</ProjectPickerContext.Provider>;
};
