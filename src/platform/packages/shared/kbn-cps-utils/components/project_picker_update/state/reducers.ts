/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject } from '../../../types';
import {
  FilterOperator,
  invertOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';
import { type ProjectRoutingExpression, projectRoutingCodec } from '../utils/project_routing_codec';
import { computeVisibleProjectIds, getIncludedVisibleProjectIds } from './derivatives';
import type { StoreReducer } from './store';

export interface FilterEntry {
  expression: FilterExpressionValue;
  enabled: boolean;
}

export interface ProjectPickerStoredState {
  isReadOnly?: boolean;
  hasUserModifiedRouting: boolean;
  defaultProjectRouting: ProjectRouting;
  originProjectId?: string;
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

export const createFilterExpressionsMap = (
  filterExpressions: FilterExpressionValue[]
): Map<string, FilterEntry> =>
  new Map(
    filterExpressions.map((expression) => [
      getFilterExpressionLookupKey(expression),
      { expression, enabled: true },
    ])
  );

export const getProjectRoutingState = ({
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

const haveSameItems = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
};

export const isUsingProjectRouting = (
  state: ProjectPickerState,
  projectRouting?: ProjectRouting
): boolean => {
  const { excludedProjectIds, filterExpressions } = getProjectRoutingState({
    availableProjects: Array.from(state.availableProjects.values()),
    originProjectId: state.originProjectId,
    projectRouting,
  });
  const expectedFilterExpressions = createFilterExpressionsMap(filterExpressions);

  return (
    state.filterExpressions.size === expectedFilterExpressions.size &&
    Array.from(expectedFilterExpressions.entries()).every(([key, value]) => {
      const current = state.filterExpressions.get(key);
      return current?.enabled === value.enabled;
    }) &&
    haveSameItems(state.excludedOverrides, excludedProjectIds)
  );
};

const withUserInteractionMiddleware =
  <P = void>(reducer: StoreReducer<ProjectPickerState, P>): StoreReducer<ProjectPickerState, P> =>
  (state, payload) => {
    const next = reducer(state, payload);
    return next === state ? state : { ...next, hasUserModifiedRouting: true };
  };

export function createStoreReducers() {
  return {
    /**
     * This action is used to set the entire store state, it should be used sparingly.
     */
    _setStoreState(
      _state: ProjectPickerState,
      payload: Pick<ProjectPickerState, 'availableProjects' | 'isReadOnly'> & {
        defaultProjectRouting?: ProjectRouting;
        excludedOverrides?: string[];
        filterExpressions?: FilterExpressionValue[];
        originProjectId?: string;
      }
    ) {
      return {
        ..._state,
        isReadOnly: payload.isReadOnly,
        defaultProjectRouting: payload.defaultProjectRouting ?? _state.defaultProjectRouting,
        originProjectId: payload.originProjectId ?? _state.originProjectId,
        availableProjects: payload.availableProjects,
        filterExpressions: createFilterExpressionsMap(payload.filterExpressions ?? []),
        excludedOverrides: payload.excludedOverrides ?? [],
        // these states are derived values we reset them for completeness, their values will be recomputed based on the new state
        filteringDimensions: [],
        filteredProjectIds: [],
        selectedProjects: [],
        visibleProjectIds: [],
      };
    },
    /**
     * Adds a new filter expression.
     */
    addFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { expression: FilterExpressionValue }) => {
        const id = getFilterExpressionLookupKey(payload.expression);
        if (state.filterExpressions.has(id)) {
          return state;
        }

        const filterExpressions = new Map(state.filterExpressions);
        filterExpressions.set(id, { expression: payload.expression, enabled: true });

        return {
          ...state,
          filterExpressions,
        };
      }
    ),
    /**
     * Updates the definition of an existing filter expression in-place.
     */
    updateFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { id: string; expression: FilterExpressionValue }) => {
        const existing = state.filterExpressions.get(payload.id);
        if (!existing) {
          return state;
        }

        const nextKey = getFilterExpressionLookupKey(payload.expression);
        if (nextKey !== payload.id && state.filterExpressions.has(nextKey)) {
          return state;
        }

        const filterExpressions = new Map(state.filterExpressions);

        if (nextKey !== payload.id) {
          filterExpressions.delete(payload.id);
        }

        filterExpressions.set(nextKey, { ...existing, expression: payload.expression });

        return {
          ...state,
          filterExpressions,
        };
      }
    ),
    /**
     * Removes the filter expression.
     */
    removeFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
        const filterExpressions = new Map(state.filterExpressions);
        filterExpressions.delete(payload.filterId);

        return {
          ...state,
          filterExpressions,
        };
      }
    ),
    /**
     * Toggles the enabled state of the filter expression.
     */
    toggleFilterExpression: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
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
      }
    ),
    /**
     * Inverts the operator of the filter expression.
     */
    invertFilterExpressionOperator: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { filterId: string }) => {
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

        const nextKey = getFilterExpressionLookupKey(inverted);
        if (nextKey !== payload.filterId && filterExpressions.has(nextKey)) {
          return state;
        }

        if (nextKey !== payload.filterId) {
          filterExpressions.delete(payload.filterId);
        }
        filterExpressions.set(nextKey, {
          ...existing,
          expression: inverted,
        });

        return {
          ...state,
          filterExpressions,
        };
      }
    ),
    /**
     * Clears all filter expressions.
     */
    clearProjectFilters: withUserInteractionMiddleware((state: ProjectPickerState) => {
      if (state.filterExpressions.size === 0) {
        return state;
      }

      return {
        ...state,
        filterExpressions: new Map(),
        excludedOverrides: [],
      };
    }),
    /**
     * Excludes the provided project ids from the selected projects list.
     */
    excludeSelectedProjects: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { projects: string[] }) => {
        const includedVisible = getIncludedVisibleProjectIds(state);
        const toExclude = payload.projects.filter((id) => includedVisible.includes(id));
        if (includedVisible.length - toExclude.length < 1) {
          return state;
        }

        return {
          ...state,
          excludedOverrides: addOverrides(state.excludedOverrides, payload.projects),
        };
      }
    ),
    /**
     * Undo the exclusion of the provided project ids from the selected projects list.
     */
    undoProjectExclusion: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { projects: string[] }) => ({
        ...state,
        excludedOverrides: removeOverrides(state.excludedOverrides, payload.projects),
      })
    ),
    revertToSpaceDefaults: withUserInteractionMiddleware((state: ProjectPickerState) => {
      const { excludedProjectIds, filterExpressions } = getProjectRoutingState({
        availableProjects: Array.from(state.availableProjects.values()),
        originProjectId: state.originProjectId,
        projectRouting: state.defaultProjectRouting,
      });

      return {
        ...state,
        filterExpressions: createFilterExpressionsMap(filterExpressions),
        excludedOverrides: excludedProjectIds,
      };
    }),
    /**
     * Includes all visible projects.
     */
    includeAllVisibleProjects: withUserInteractionMiddleware((state: ProjectPickerState) => ({
      ...state,
      excludedOverrides: removeOverrides(state.excludedOverrides, computeVisibleProjectIds(state)),
    })),
    /**
     * Sets the provided project id as the only project to be included, excluding all other projects.
     */
    includeOnlyProvidedProjectId: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { anchorProjectId: string }) => {
        const visibleProjectIds = computeVisibleProjectIds(state);
        if (!visibleProjectIds.includes(payload.anchorProjectId)) {
          return state;
        }

        const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);
        const nextExcludedOverrides = removeOverrides(
          addOverrides(state.excludedOverrides, otherVisibleIds),
          [payload.anchorProjectId]
        );

        if (
          nextExcludedOverrides.length === state.excludedOverrides.length &&
          nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
        ) {
          return state;
        }

        return { ...state, excludedOverrides: nextExcludedOverrides };
      }
    ),
    /**
     * Excludes the provided project id, set all other projects as included.
     */
    excludeOnlyProvidedProjectId: withUserInteractionMiddleware(
      (state: ProjectPickerState, payload: { anchorProjectId: string }) => {
        const visibleProjectIds = computeVisibleProjectIds(state);
        if (!visibleProjectIds.includes(payload.anchorProjectId)) {
          return state;
        }

        const otherVisibleIds = visibleProjectIds.filter((id) => id !== payload.anchorProjectId);
        const nextExcludedOverrides = removeOverrides(
          addOverrides(state.excludedOverrides, [payload.anchorProjectId]),
          otherVisibleIds
        );

        if (
          nextExcludedOverrides.length === state.excludedOverrides.length &&
          nextExcludedOverrides.every((id) => state.excludedOverrides.includes(id))
        ) {
          return state;
        }

        return { ...state, excludedOverrides: nextExcludedOverrides };
      }
    ),
  } as const;
}
