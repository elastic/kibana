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
import { filterExpressionCodec } from '../utils/codec';
import type { StoreDerivative } from './store';
import type { ProjectPickerState } from './reducers';

const getProjectFieldValue = (project: CPSProject, tagName: string): string | undefined => {
  const normalizedKey = tagName.startsWith('_') ? tagName : `_${tagName}`;
  return project[normalizedKey] ?? project[tagName];
};

const isNegatedFilterOperator = (operator: string | undefined): boolean => {
  return operator === '-' || operator === 'is not';
};

export const applyFilterExpressions = (
  availableProjects: Map<CPSProject['_id'], CPSProject>,
  filterExpression: string[]
): string[] => {
  if (filterExpression.length === 0) {
    return [];
  }

  let matchingIds = Array.from(availableProjects.keys());

  for (const expression of filterExpression) {
    const { operator, tagName, tagValue } = filterExpressionCodec.decode(expression);

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

export const computeSelectedProjects = (
  state: Pick<
    ProjectPickerState,
    'filteredProjectIds' | 'availableProjects' | 'includedOverrides' | 'excludedOverrides'
  >
): string[] => {
  const base =
    state.filteredProjectIds.length > 0
      ? state.filteredProjectIds
      : Array.from(state.availableProjects.keys());

  return uniq([
    ...base.filter((id) => !state.excludedOverrides.includes(id)),
    ...state.includedOverrides.filter((id) => state.availableProjects.has(id)),
  ]);
};

export const projectPickerDerivatives = [
  {
    key: 'filteredProjectIds',
    compute: (state: ProjectPickerState) =>
      applyFilterExpressions(state.availableProjects, state.filterExpression),
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
