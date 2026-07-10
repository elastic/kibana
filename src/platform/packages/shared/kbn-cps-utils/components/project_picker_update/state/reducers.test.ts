/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../types';
import { createStoreReducers, type ProjectPickerState } from './reducers';

const createProject = (overrides: Partial<CPSProject> & Pick<CPSProject, '_id'>): CPSProject => ({
  _alias: 'alias',
  _type: 'security',
  _organisation: 'org',
  ...overrides,
});

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const availableProjects = overrides.availableProjects ?? new Map<string, CPSProject>();

  return {
    filterExpression: [],
    availableProjects,
    includedOverrides: [],
    excludedOverrides: [],
    filteredProjectIds: [],
    selectedProjects: [],
    ...overrides,
  };
};

describe('createStoreReducers', () => {
  const reducers = createStoreReducers();

  it('updates override fields instead of selectedProjects', () => {
    const state = createState({
      availableProjects: new Map([['p1', createProject({ _id: 'p1' })]]),
    });

    const nextState = reducers.setSelectedProjects(state, { projects: ['p1'] });

    expect(nextState.includedOverrides).toEqual(['p1']);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('clears stored filters and overrides when clearing project filters', () => {
    const state = createState({
      filterExpression: ['_type:security'],
      includedOverrides: ['p1'],
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.clearProjectFilters(state);

    expect(nextState.filterExpression).toEqual([]);
    expect(nextState.includedOverrides).toEqual([]);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('resets filters and overrides when reverting to space defaults', () => {
    const state = createState({
      filterExpression: ['_type:security'],
      includedOverrides: ['p1'],
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.revertToSpaceDefaults(state);

    expect(nextState.filterExpression).toEqual([]);
    expect(nextState.includedOverrides).toEqual([]);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('appends filter expressions without touching overrides', () => {
    const state = createState({
      filterExpression: ['_type:security'],
      includedOverrides: ['p1'],
    });

    const nextState = reducers.setFilterExpression(state, {
      filterExpression: '_region:us-east-1',
    });

    expect(nextState.filterExpression).toEqual(['_type:security', '_region:us-east-1']);
    expect(nextState.includedOverrides).toEqual(['p1']);
  });
});
