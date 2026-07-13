/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../types';
import { createStoreReducers, type FilterEntry, type ProjectPickerState } from './reducers';

const createProject = (overrides: Partial<CPSProject> & Pick<CPSProject, '_id'>): CPSProject => ({
  _alias: 'alias',
  _type: 'security',
  _organisation: 'org',
  ...overrides,
});

const createFilterExpressions = (
  entries: Array<[string, string, boolean?]>
): Map<string, FilterEntry> =>
  new Map(entries.map(([id, expression, enabled = true]) => [id, { expression, enabled }]));

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const availableProjects = overrides.availableProjects ?? new Map<string, CPSProject>();

  return {
    filterExpressions: new Map(),
    filteringDimensions: [],
    availableProjects,
    includedOverrides: [],
    excludedOverrides: [],
    filteredProjectIds: [],
    visibleProjectIds: [],
    selectedProjects: [],
    ...overrides,
  };
};

describe('createStoreReducers', () => {
  const reducers = createStoreReducers();

  beforeAll(() => {
    if (!window.crypto.randomUUID) {
      Object.defineProperty(window.crypto, 'randomUUID', {
        value: () => 'generated-filter-id',
        configurable: true,
      });
    }
  });

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
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      includedOverrides: ['p1'],
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.clearProjectFilters(state);

    expect(nextState.filterExpressions).toEqual(new Map());
    expect(nextState.includedOverrides).toEqual([]);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('resets filters and overrides when reverting to space defaults', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      includedOverrides: ['p1'],
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.revertToSpaceDefaults(state);

    expect(nextState.filterExpressions).toEqual(new Map());
    expect(nextState.includedOverrides).toEqual([]);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('adds filter expressions without touching overrides', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      includedOverrides: ['p1'],
    });

    const nextState = reducers.addFilterExpression(state, {
      expression: 'is:_region:us-east-1',
    });

    expect(nextState.filterExpressions.size).toBe(2);
    expect(nextState.filterExpressions.get('f1')).toEqual({
      expression: 'is:_type:security',
      enabled: true,
    });
    expect([...nextState.filterExpressions.values()].map((entry) => entry.expression)).toContain(
      'is:_region:us-east-1'
    );
    expect(nextState.includedOverrides).toEqual(['p1']);
  });

  it('updates an existing filter expression in place', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
    });

    const nextState = reducers.updateFilterExpression(state, {
      id: 'f1',
      expression: 'is:_type:observability',
    });

    expect(nextState.filterExpressions).toEqual(
      createFilterExpressions([['f1', 'is:_type:observability']])
    );
    expect(nextState.filterExpressions.size).toBe(1);
  });

  it('does not change state when updating a missing filter id', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
    });

    const nextState = reducers.updateFilterExpression(state, {
      id: 'missing',
      expression: 'is:_type:observability',
    });

    expect(nextState).toBe(state);
  });

  it('removes a filter expression by id', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([
        ['f1', 'is:_type:security'],
        ['f2', 'is:_region:us-east-1'],
      ]),
    });

    const nextState = reducers.removeFilterExpression(state, { id: 'f1' });

    expect(nextState.filterExpressions).toEqual(
      createFilterExpressions([['f2', 'is:_region:us-east-1']])
    );
  });

  it('includes only visible project ids when filters are active', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p2', createProject({ _id: 'p2', _type: 'observability' })],
      ]),
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      filteredProjectIds: ['p1'],
      visibleProjectIds: ['p1'],
      excludedOverrides: ['p1'],
    });

    const nextState = reducers.includeAllVisibleProjects(state);

    expect(nextState.includedOverrides).toEqual(['p1']);
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('does not clear project filters when there are no filter expressions', () => {
    const state = createState({
      includedOverrides: ['p1'],
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.clearProjectFilters(state);

    expect(nextState).toBe(state);
  });

  it('does not exclude the last included visible project', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1' })],
        ['p2', createProject({ _id: 'p2' })],
      ]),
      visibleProjectIds: ['p1', 'p2'],
      selectedProjects: ['p1'],
      includedOverrides: ['p1'],
    });

    const nextState = reducers.excludeSelectedProjects(state, { projects: ['p1'] });

    expect(nextState).toBe(state);
  });

  it('excludes a visible project when more than one visible project is included', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1' })],
        ['p2', createProject({ _id: 'p2' })],
      ]),
      visibleProjectIds: ['p1', 'p2'],
      selectedProjects: ['p1', 'p2'],
      includedOverrides: ['p1', 'p2'],
    });

    const nextState = reducers.excludeSelectedProjects(state, { projects: ['p1'] });

    expect(nextState.excludedOverrides).toEqual(['p1']);
    expect(nextState.includedOverrides).toEqual(['p2']);
  });

  it('does not exclude all visible projects when at least one visible project is included', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1' })],
        ['p2', createProject({ _id: 'p2' })],
      ]),
      visibleProjectIds: ['p1', 'p2'],
      selectedProjects: ['p1', 'p2'],
      includedOverrides: ['p1', 'p2'],
    });

    const nextState = reducers.excludeAllVisibleProjects(state);

    expect(nextState).toBe(state);
  });
});
