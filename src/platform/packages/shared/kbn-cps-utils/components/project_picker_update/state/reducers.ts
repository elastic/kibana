/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../types';

export interface ProjectPickerState {
  selectedProjects: string[];
  availableProjects: Map<CPSProject['_id'], CPSProject>;
  filterExpression: string[];
}

export function createStoreReducers() {
  return {
    /**
     * Includes the provided project ids in the selected projects list.
     */
    setSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      selectedProjects: state.selectedProjects.concat(payload.projects),
    }),
    /**
     * Excludes the provided project ids from the selected projects list.
     */
    excludeSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      selectedProjects: state.selectedProjects.filter((p) => !payload.projects.includes(p)),
    }),
    /**
     * Sets the available projects map.
     */
    setAvailableProjects: (state: ProjectPickerState, payload: { projects: CPSProject[] }) => ({
      ...state,
      availableProjects: new Map(payload.projects.map((project) => [project._id, project])),
    }),
    revertToSpaceDefaults: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: Array.from(state.availableProjects.keys()),
    }),
    clearProjectFilters: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: [],
    }),
    includeAllVisibleProjects: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: Array.from(state.availableProjects.keys()),
    }),
    excludeAllVisibleProjects: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: state.selectedProjects.filter((p) => !state.availableProjects.has(p)),
    }),
    setFilterExpression: (state: ProjectPickerState, payload: { filterExpression: string }) => ({
      ...state,
      filterExpression: payload.filterExpression,
    }),
  } as const;
}
