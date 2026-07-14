/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../types';
import { filterExpressionCodec, FilterOperator } from '../utils/codec';
import type { StoreDerivative } from './store';
import type { FilterEntry, ProjectPickerState } from './reducers';

const getProjectFieldValue = (project: CPSProject, tagName: string): string | undefined => {
  const normalizedKey = tagName.startsWith('_') ? tagName : `_${tagName}`;
  return project[normalizedKey] ?? project[tagName];
};

const isNegatedFilterOperator = (operator: string | undefined): boolean => {
  return operator === FilterOperator.NOT_EQUALS || operator === '-' || operator === 'is not';
};

export const applyFilterExpressions = (
  availableProjects: Map<CPSProject['_id'], CPSProject>,
  filterExpressions: Map<string, FilterEntry>
): string[] => {
  if (filterExpressions.size === 0) {
    return [];
  }

  let matchingIds = Array.from(availableProjects.keys());

  for (const entry of filterExpressions.values()) {
    if (!entry.enabled) {
      continue;
    }

    const { operator, tagName, tagValue } = filterExpressionCodec.decode(entry.expression);

    if (!tagName || !tagValue) {
      continue;
    }

    const isNegated = isNegatedFilterOperator(operator);
    matchingIds = matchingIds.filter((id) => {
      const project = availableProjects.get(id);
      if (!project) {
        return false;
      }

      const fieldValue = getProjectFieldValue(project, tagName);
      const matches = fieldValue === tagValue;
      return isNegated ? !matches : matches;
    });
  }

  return matchingIds;
};

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

export const computeVisibleProjectIds = (
  state: Pick<ProjectPickerState, 'availableProjects' | 'filterExpressions' | 'filteredProjectIds'>
): string[] => {
  if (!hasActiveFilterExpressions(state.filterExpressions)) {
    return Array.from(state.availableProjects.keys());
  }
  return state.filteredProjectIds;
};

export const getIncludedVisibleProjectIds = (
  state: Pick<ProjectPickerState, 'visibleProjectIds' | 'selectedProjects'>
): string[] => {
  const selected = new Set(state.selectedProjects);
  return state.visibleProjectIds.filter((id) => selected.has(id));
};

export const computeSelectedProjects = (
  state: Pick<ProjectPickerState, 'filteredProjectIds' | 'availableProjects' | 'excludedOverrides'>
): string[] => {
  const base =
    state.filteredProjectIds.length > 0
      ? state.filteredProjectIds
      : Array.from(state.availableProjects.keys());

  return base.filter((id) => !state.excludedOverrides.includes(id));
};

/**
 * Derivatives are computed values that are derived from the state of the project picker.
 * Order is important here, when derivations depend on other derivations, they should be computed after the dependent derivations.
 */
export const projectPickerDerivatives = [
  {
    key: 'filteredProjectIds',
    compute: (state: ProjectPickerState) =>
      applyFilterExpressions(state.availableProjects, state.filterExpressions),
  },
  {
    key: 'visibleProjectIds',
    compute: (state: ProjectPickerState) => computeVisibleProjectIds(state),
  },
  {
    key: 'selectedProjects',
    compute: (state: ProjectPickerState) => computeSelectedProjects(state),
  },
  {
    key: 'filteringDimensions',
    compute: (state: ProjectPickerState) => {
      return Object.keys(state.availableProjects.values().next().value ?? {});
    },
  },
] as const satisfies Array<StoreDerivative<ProjectPickerState, keyof ProjectPickerState>>;
