/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoreDerivative } from './store';
import type { FilterEntry, ProjectPickerState } from './reducers';
import { type FilterExpressionValue } from '../utils/filter_input_codec';
import { PROJECT_SELECTION_DIMENSION, projectRoutingCodec } from '../utils/project_routing_codec';

export const hasActiveFilterExpressions = (
  filterExpressions: Map<string, FilterEntry>
): boolean => {
  for (const entry of filterExpressions.values()) {
    if (entry.enabled) {
      return true;
    }
  }
  return false;
};

/**
 * Computes the list of project IDs that are currently displayed in the list based on the available projects and filter expressions provided by the user.
 */
export const computeVisibleProjectIds = (
  state: Pick<ProjectPickerState, 'availableProjects' | 'filterExpressions' | 'filteredProjectIds'>
): string[] => {
  if (!hasActiveFilterExpressions(state.filterExpressions)) {
    return Array.from(state.availableProjects.keys());
  }
  return state.filteredProjectIds;
};

export const getIncludedVisibleProjectIds = (
  state: Pick<ProjectPickerState, 'visibleProjectIds' | 'selectedProjectIds'>
): string[] => {
  const selected = new Set(state.selectedProjectIds);
  return state.visibleProjectIds.filter((id) => selected.has(id));
};

/**
 * Computes the list of project ids that are currently enabled from the visible list.
 * It factors in the user defined exclusion overrides.
 */
export const computeSelectedProjects = (
  state: Pick<
    ProjectPickerState,
    'filteredProjectIds' | 'availableProjects' | 'excludedOverrides' | 'filterExpressions'
  >
): string[] => {
  const base = computeVisibleProjectIds(state);

  return base.filter((id) => !state.excludedOverrides.includes(id));
};

/**
 * The filters chips/menus should read: the pending proposal's filters if one exists, otherwise
 * the committed ones. Lets edits appear immediately in the UI, ahead of server confirmation.
 */
export const computeDisplayedFilterExpressions = (
  state: Pick<ProjectPickerState, 'proposedFilters' | 'filterExpressions'>
): Map<string, FilterEntry> => state.proposedFilters?.filterExpressions ?? state.filterExpressions;

export const computeIsFilterProposalPending = (
  state: Pick<ProjectPickerState, 'proposedFilters'>
): boolean => state.proposedFilters !== null;

export const computeCurrentProjectRouting = (state: ProjectPickerState) => {
  let routing = projectRoutingCodec.encode({
    filterExpressions: Array.from(state.filterExpressions.values()).reduce((acc, entry) => {
      if (entry.enabled) {
        acc.push(entry.expression);
      }
      return acc;
    }, [] as FilterExpressionValue[]),
    excludedProjectIds: state.excludedOverrides,
    selectedProjectIds: state.selectedProjectIds,
    projectRoutingStrategy: state.projectRoutingStrategy,
  });

  // fallback that captures all projects but is however project routing strategy
  // aware
  routing ||=
    state.projectRoutingStrategy === 'dynamic'
      ? `${PROJECT_SELECTION_DIMENSION}:*`
      : Array.from(state.availableProjects.keys())
          .map((id) => `${PROJECT_SELECTION_DIMENSION}:${id}`)
          .join(' AND ');

  return routing;
};

/**
 * Derivatives are computed values that are derived from the state of the project picker.
 * Order is important here, when derivations depend on other derivations, they should be computed after the dependent derivations.
 */
export const projectPickerDerivatives = [
  {
    key: 'displayedFilterExpressions',
    compute: (state: ProjectPickerState) => computeDisplayedFilterExpressions(state),
  },
  {
    key: 'isFilterProposalPending',
    compute: (state: ProjectPickerState) => computeIsFilterProposalPending(state),
  },
  {
    key: 'visibleProjectIds',
    compute: (state: ProjectPickerState) => computeVisibleProjectIds(state),
  },
  {
    key: 'selectedProjectIds',
    compute: (state: ProjectPickerState) => computeSelectedProjects(state),
  },
  {
    key: 'filteringDimensions',
    compute: (state: ProjectPickerState) => {
      const dimensions = new Set<string>();
      for (const project of state.availableProjects.values()) {
        for (const key of Object.keys(project)) {
          if (key !== PROJECT_SELECTION_DIMENSION) {
            dimensions.add(key);
          }
        }
      }
      return Array.from(dimensions);
    },
  },
  {
    key: 'currentProjectRouting',
    compute: (state: ProjectPickerState) => computeCurrentProjectRouting(state),
  },
  {
    key: 'isUsingSpaceDefaults',
    compute: (state: ProjectPickerState) =>
      state.currentProjectRouting === state.defaultProjectRouting,
  },
] as const satisfies Array<StoreDerivative<ProjectPickerState, keyof ProjectPickerState>>;
