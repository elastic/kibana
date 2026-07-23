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
import {
  FilterOperator,
  invertOperator,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';
import { computeVisibleProjectIds, getIncludedVisibleProjectIds } from './derivatives';

export interface FilterEntry {
  expression: FilterExpressionValue;
  enabled: boolean;
}

export interface ProjectPickerStoredState {
  filteringDimensions: string[];
  filterExpressions: Map<string, FilterEntry>;
  availableProjects: Map<CPSProject['_id'], CPSProject>;
  excludedOverrides: string[];
}

export interface ProjectPickerState extends ProjectPickerStoredState {
  /**
   * This is the list of project ids that match the filter expressions the user has applied.
   */
  filteredProjectIds: string[];
  /**
   * This is the list of projects that qualify to be displayed considering the filter expressions the user has applied.
   */
  selectedProjects: string[];
  /**
   * This is the list of projects that currently displayed in the list, it is a subset of {@link ProjectPickerState.selectedProjects},
   * considering if the user has made any overrides to exclude certain projects from the list.
   */
  visibleProjectIds: string[];
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
     * Adds a new filter expression.
     */
    addFilterExpression: (
      state: ProjectPickerState,
      payload: { expression: FilterExpressionValue }
    ) => {
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
      payload: { id: string; expression: FilterExpressionValue }
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
    removeFilterExpression: (state: ProjectPickerState, payload: { filterId: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      filterExpressions.delete(payload.filterId);

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Toggles the enabled state of the filter expression.
     */
    toggleFilterExpression: (state: ProjectPickerState, payload: { filterId: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      const existing = filterExpressions.get(payload.filterId);

      if (!existing) {
        return state;
      }

      filterExpressions.set(payload.filterId, { ...existing, enabled: !existing.enabled });

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Inverts the operator of the filter expression.
     */
    invertFilterExpressionOperator: (state: ProjectPickerState, payload: { filterId: string }) => {
      const filterExpressions = new Map(state.filterExpressions);
      const existing = filterExpressions.get(payload.filterId);

      if (!existing) {
        return state;
      }

      let inverted: FilterExpressionValue;

      // this switch is necessary as a type narrowing mechanism
      switch (existing.expression.operator) {
        case FilterOperator.EQUALS:
        case FilterOperator.NOT_EQUALS:
          inverted = {
            ...existing.expression,
            operator: invertOperator(existing.expression.operator),
          };
          break;
        case FilterOperator.ONE_OF:
        case FilterOperator.NOT_ONE_OF:
          inverted = {
            ...existing.expression,
            operator: invertOperator(existing.expression.operator),
          };
          break;
        case FilterOperator.EXISTS:
        case FilterOperator.NOT_EXISTS:
          inverted = {
            ...existing.expression,
            operator: invertOperator(existing.expression.operator),
          };
          break;
        default:
          return state;
      }

      filterExpressions.set(payload.filterId, {
        ...existing,
        expression: inverted,
      });

      return {
        ...state,
        filterExpressions,
      };
    },
    /**
     * Clears all filter expressions.
     */
    clearProjectFilters: (state: ProjectPickerState) => {
      if (state.filterExpressions.size === 0) {
        return state;
      }

      return {
        ...state,
        filterExpressions: new Map(),
        excludedOverrides: [],
      };
    },
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
      };
    },
    /**
     * Undo the exclusion of the provided project ids from the selected projects list.
     */
    undoProjectExclusion: (state: ProjectPickerState, payload: { projects: string[] }) => ({
      ...state,
      excludedOverrides: removeOverrides(state.excludedOverrides, payload.projects),
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
      filterExpressions: new Map(),
      excludedOverrides: [],
    }),
    /**
     * Includes all visible projects.
     */
    includeAllVisibleProjects: (state: ProjectPickerState) => ({
      ...state,
      excludedOverrides: removeOverrides(state.excludedOverrides, computeVisibleProjectIds(state)),
    }),
    /**
     * Includes all other visible projects while preserving the anchor project's exclusion state.
     */
    includeAllOtherVisibleProjects: (
      state: ProjectPickerState,
      payload: { anchorProjectId: string }
    ) => {
      const visibleProjectIds = computeVisibleProjectIds(state);
      const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);

      const nextExcludedOverrides = removeOverrides(state.excludedOverrides, otherVisibleIds);

      if (
        nextExcludedOverrides.length === state.excludedOverrides.length &&
        nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
      ) {
        return state;
      }

      return { ...state, excludedOverrides: nextExcludedOverrides };
    },
    /**
     * Excludes all other visible projects while preserving the anchor project's exclusion state.
     */
    excludeAllOtherVisibleProjects: (
      state: ProjectPickerState,
      payload: { anchorProjectId: string }
    ) => {
      const visibleProjectIds = computeVisibleProjectIds(state);
      const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);
      const toExclude = otherVisibleIds.filter((id) => !state.excludedOverrides.includes(id));

      if (getIncludedVisibleProjectIds(state).length - toExclude.length < 1) {
        return state;
      }

      const nextExcludedOverrides = addOverrides(state.excludedOverrides, otherVisibleIds);

      if (
        nextExcludedOverrides.length === state.excludedOverrides.length &&
        nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
      ) {
        return state;
      }

      return { ...state, excludedOverrides: nextExcludedOverrides };
    },
  } as const;
}
