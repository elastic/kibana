/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ProjectPickerState {
  selectedProjects: string[];
  availableProjects: string[];
}

export function createStoreReducers() {
  return {
    setSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      selectedProjects: payload.projects,
    }),
    setAvailableProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      availableProjects: payload.projects,
    }),
    revertToSpaceDefaults: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: state.availableProjects,
    }),
    clearProjectFilters: (state: ProjectPickerState) => ({
      ...state,
      selectedProjects: [],
    }),
  } as const;
}
