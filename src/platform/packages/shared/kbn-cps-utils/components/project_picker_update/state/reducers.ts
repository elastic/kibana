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
import { FilterOperator, filterExpressionCodec } from '../utils/codec';
import { computeVisibleProjectIds, getIncludedVisibleProjectIds } from './derivatives';

export interface FilterEntry {
  expression: string;
  enabled: boolean;
}

export interface ProjectPickerStoredState {
  filteringDimensions: string[];
  filterExpressions: Map<string, FilterEntry>;
  availableProjects: Map<CPSProject['_id'], CPSProject>;
  includedOverrides: string[];
  excludedOverrides: string[];
}

export interface ProjectPickerState extends ProjectPickerStoredState {
  filteredProjectIds: string[];
  visibleProjectIds: string[];
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
    excludeSelectedProjects: (state: ProjectPickerState, payload: { projects: string[] }) => {
      const includedVisible = getIncludedVisibleProjectIds(state);
      const toExclude = payload.projects.filter((id) => includedVisible.includes(id));
      if (includedVisible.length - toExclude.length < 1) {
        return state;
      }

      return {
        ...state,
        excludedOverrides: addOverrides(state.excludedOverrides, payload.projects),
        includedOverrides: removeOverrides(state.includedOverrides, payload.projects),
      };
    },
    /**
     * Sets the available projects map.
     */
    setAvailableProjects: (state: ProjectPickerState, payload: { projects: CPSProject[] }) => ({
      ...state,
      availableProjects: new Map(payload.projects.map((project) => [project._id, project])),
    }),
    revertToSpaceDefaults: (state: ProjectPickerState) => ({
      ...state,
      filterExpressions: new Map(),
      includedOverrides: [],
      excludedOverrides: [],
    }),
    clearProjectFilters: (state: ProjectPickerState) => {
      if (state.filterExpressions.size === 0) {
        return state;
      }

      return {
        ...state,
        filterExpressions: new Map(),
        includedOverrides: [],
        excludedOverrides: [],
      };
    },
    includeAllVisibleProjects: (state: ProjectPickerState) => {
      const visibleProjectIds = computeVisibleProjectIds(state);

      return {
        ...state,
        includedOverrides: addOverrides(state.includedOverrides, visibleProjectIds),
        excludedOverrides: removeOverrides(state.excludedOverrides, visibleProjectIds),
      };
    },
    /**
     * Excludes all visible projects.
     */
    excludeAllVisibleProjects: (state: ProjectPickerState) => {
      if (getIncludedVisibleProjectIds(state).length >= 1) {
        return state;
      }

      const visibleProjectIds = computeVisibleProjectIds(state);

      return {
        ...state,
        excludedOverrides: addOverrides(state.excludedOverrides, visibleProjectIds),
        includedOverrides: removeOverrides(state.includedOverrides, visibleProjectIds),
      };
    },
    /**
     * Adds a new filter expression.
     */
    addFilterExpression: (state: ProjectPickerState, payload: { expression: string }) => {
      const id = window.crypto.randomUUID();
      const filterExpressions = new Map(state.filterExpressions);
      filterExpressions.set(id, { expression: payload.expression, enabled: true });

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Updates the definition of an existing filter expression in-place.
     */
    updateFilterExpression: (
      state: ProjectPickerState,
      payload: { id: string; expression: string }
    ) => {
      const existing = state.filterExpressions.get(payload.id);
      if (!existing) {
        return state;
      }

      const filterExpressions = new Map(state.filterExpressions);
      filterExpressions.set(payload.id, { ...existing, expression: payload.expression });

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Removes the filter expression.
     */
    removeFilterExpression: (state: ProjectPickerState, payload: { id: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      filterExpressions.delete(payload.id);

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Toggles the enabled state of the filter expression.
     */
    toggleFilterExpression: (state: ProjectPickerState, payload: { id: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      const existing = filterExpressions.get(payload.id);

      if (!existing) {
        return state;
      }

      filterExpressions.set(payload.id, { ...existing, enabled: !existing.enabled });

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Inverts the operator of the filter expression.
     */
    invertFilterExpressionOperator: (state: ProjectPickerState, payload: { id: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      const existing = filterExpressions.get(payload.id);

      if (!existing) {
        return state;
      }

      const { operator, ...rest } = filterExpressionCodec.decode(existing.expression);

      filterExpressions.set(payload.id, {
        ...existing,
        expression: filterExpressionCodec.encode({
          ...rest,
          operator:
            operator === FilterOperator.EQUALS ? FilterOperator.NOT_EQUALS : FilterOperator.EQUALS,
        })!,
      });

      return {
        ...state,
        filterExpressions,
      };
    },
  } as const;
}
