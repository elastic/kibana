/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import type { CPSProject } from '../../../types';

export interface ProjectPickerStoredState {
  filterExpression: string[];
  availableProjects: Map<CPSProject['_id'], CPSProject>;
  includedOverrides: string[];
  excludedOverrides: string[];
}

export interface ProjectPickerState extends ProjectPickerStoredState {
  filteredProjectIds: string[];
  selectedProjects: string[];
}

const addOverrides = (overrides: string[], projectIds: string[]): string[] => {
  return uniq([...overrides, ...projectIds]);
};

const removeOverrides = (overrides: string[], projectIds: string[]): string[] => {
  return overrides.filter((id) => !projectIds.includes(id));
};

export function createStoreReducers() {
  return {
    /**
     * Includes the provided project ids in the selected projects list.
     */
    setSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      includedOverrides: addOverrides(state.includedOverrides, payload.projects),
      excludedOverrides: removeOverrides(state.excludedOverrides, payload.projects),
    }),
    /**
     * Excludes the provided project ids from the selected projects list.
     */
    excludeSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      excludedOverrides: addOverrides(state.excludedOverrides, payload.projects),
      includedOverrides: removeOverrides(state.includedOverrides, payload.projects),
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
      filterExpression: [],
      includedOverrides: [],
      excludedOverrides: [],
    }),
    clearProjectFilters: (state: ProjectPickerState) => ({
      ...state,
      filterExpression: [],
      includedOverrides: [],
      excludedOverrides: [],
    }),
    includeAllVisibleProjects: (state: ProjectPickerState) => {
      const visibleProjectIds = Array.from(state.availableProjects.keys());

      return {
        ...state,
        includedOverrides: addOverrides(state.includedOverrides, visibleProjectIds),
        excludedOverrides: removeOverrides(state.excludedOverrides, visibleProjectIds),
      };
    },
    excludeAllVisibleProjects: (state: ProjectPickerState) => {
      const visibleProjectIds = Array.from(state.availableProjects.keys());

      return {
        ...state,
        excludedOverrides: addOverrides(state.excludedOverrides, visibleProjectIds),
        includedOverrides: removeOverrides(state.includedOverrides, visibleProjectIds),
      };
    },
    setFilterExpression: (state: ProjectPickerState, payload: { filterExpression: string }) => ({
      ...state,
      filterExpression: state.filterExpression.concat(payload.filterExpression),
    }),
  } as const;
}
