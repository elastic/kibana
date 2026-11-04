/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { StoreDerivative } from './store';
import type { FilterEntry, ProjectPickerState } from './reducers';
import type { ProjectRoutingStrategy } from '../utils/project_routing_codec';
import { PROJECT_SELECTION_DIMENSION, projectRoutingCodec } from '../utils/project_routing_codec';
import {
  createFilterExpressionsMap,
  isAliasExistsFilter,
  parseDefaultProjectRouting,
} from '../utils';
import { getEnabledFilterExpressions, getEnabledFiltersIdentity } from '../utils/state_utils';

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

/**
 * Whether the committed state is semantically equivalent to the space default routing.
 *
 * Compares the parsed default's filters and exclusions against the committed state rather
 * than comparing routing strings: re-encoding is not string-stable — under the `snapshot`
 * strategy the encoder always appends an explicit `_id:…` enumeration, and even `dynamic`
 * defaults need not re-encode byte-for-byte (e.g. `'_alias:origin AND _id:*'` collapses to
 * `'_alias:origin'`) — so string equality would report `false` forever after a revert.
 */
export const computeIsUsingSpaceDefaults = (
  state: Pick<
    ProjectPickerState,
    | 'defaultProjectRouting'
    | 'availableProjects'
    | 'originProjectId'
    | 'filterExpressions'
    | 'excludedOverrides'
  >
): boolean => {
  // A blank default means the space has no default routing configured, so there is nothing
  // to be "using" (and nothing the revert action could restore).
  if (!state.defaultProjectRouting?.trim()) {
    return false;
  }

  const parsed = parseDefaultProjectRouting(
    state.defaultProjectRouting,
    Array.from(state.availableProjects.keys()),
    state.originProjectId
  );

  const filtersMatch =
    getEnabledFiltersIdentity(createFilterExpressionsMap(parsed.filterExpressions)) ===
    getEnabledFiltersIdentity(state.filterExpressions);

  if (!filtersMatch) {
    return false;
  }

  const defaultExclusions = new Set(parsed.excludedOverrides);
  return (
    state.excludedOverrides.length === defaultExclusions.size &&
    state.excludedOverrides.every((id) => defaultExclusions.has(id))
  );
};

export const computeCurrentProjectRouting = (state: ProjectPickerState) => {
  const enabledFilters = getEnabledFilterExpressions(state.filterExpressions);
  const isOriginOnlySelection =
    Boolean(state.originProjectId) &&
    state.selectedProjectIds.length === 1 &&
    state.selectedProjectIds[0] === state.originProjectId;
  const isAliasExistsOnly = enabledFilters.length === 1 && isAliasExistsFilter(enabledFilters[0]);

  if (isAliasExistsOnly && isOriginOnlySelection) {
    return PROJECT_ROUTING.ORIGIN;
  }

  if (
    isAliasExistsOnly &&
    state.projectRoutingStrategy === 'dynamic' &&
    state.excludedOverrides.length === 0
  ) {
    return PROJECT_ROUTING.ALL;
  }

  if (enabledFilters.length === 0) {
    if (state.projectRoutingStrategy === 'dynamic' && state.excludedOverrides.length === 0) {
      return PROJECT_ROUTING.ALL;
    }

    if (state.projectRoutingStrategy === 'snapshot' && state.selectedProjectIds.length === 0) {
      return PROJECT_ROUTING.ALL;
    }
  }

  return projectRoutingCodec.encode({
    filterExpressions: enabledFilters,
    excludedProjectIds: state.excludedOverrides,
    selectedProjectIds: state.selectedProjectIds,
    projectRoutingStrategy: state.projectRoutingStrategy as ProjectRoutingStrategy,
  });
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
    compute: (state: ProjectPickerState) => computeIsUsingSpaceDefaults(state),
  },
] as const satisfies Array<StoreDerivative<ProjectPickerState, keyof ProjectPickerState>>;
