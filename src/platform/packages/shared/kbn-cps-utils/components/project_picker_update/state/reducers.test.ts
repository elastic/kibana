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
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const typeSecurityKey = getFilterExpressionLookupKey(typeSecurityExpression);

const regionUsEastExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_region',
  tagValue: 'us-east-1',
} as const;

const createProject = (overrides: Partial<CPSProject> & Pick<CPSProject, '_id'>): CPSProject => ({
  _alias: 'alias',
  _type: 'security',
  _organisation: 'org',
  ...overrides,
});

const createFilterExpressions = (
  entries: Array<[FilterExpressionValue, boolean?]>
): Map<string, FilterEntry> =>
  new Map(
    entries.map(([expression, enabled = true]) => [
      getFilterExpressionLookupKey(expression),
      { expression, enabled },
    ])
  );

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const availableProjects = overrides.availableProjects ?? new Map<string, CPSProject>();

  return {
    filterExpressions: new Map(),
    filteringDimensions: [],
    availableProjects,
    excludedOverrides: [],
    filteredProjectIds: [],
    visibleProjectIds: [],
    selectedProjects: [],
    ...overrides,
  };
};

describe('createStoreReducers', () => {
  const reducers = createStoreReducers();

  it('updates override fields instead of selectedProjects', () => {
    const state = createState({
      availableProjects: new Map([['p1', createProject({ _id: 'p1' })]]),
      excludedOverrides: ['p1'],
    });

    const nextState = reducers.undoProjectExclusion(state, { projects: ['p1'] });

    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('clears stored filters and overrides when clearing project filters', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.clearProjectFilters(state);

    expect(nextState.filterExpressions).toEqual(new Map());
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('resets filters and overrides when reverting to space defaults', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      excludedOverrides: ['p2'],
    });

    const nextState = reducers.revertToSpaceDefaults(state);

    expect(nextState.filterExpressions).toEqual(new Map());
    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('adds filter expressions without touching overrides', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      excludedOverrides: ['p1'],
    });

    const nextState = reducers.addFilterExpression(state, {
      expression: { operator: FilterOperator.EQUALS, tagName: '_region', tagValue: 'us-east-1' },
    });

    expect(nextState.filterExpressions.size).toBe(2);
    expect(nextState.filterExpressions.get(typeSecurityKey)).toEqual({
      expression: typeSecurityExpression,
      enabled: true,
    });
    expect(
      [...nextState.filterExpressions.values()].map((entry) => entry.expression)
    ).toContainEqual({
      operator: FilterOperator.EQUALS,
      tagName: '_region',
      tagValue: 'us-east-1',
    });
    expect(nextState.excludedOverrides).toEqual(['p1']);
  });

  it('does not add a duplicate filter expression', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    const nextState = reducers.addFilterExpression(state, {
      expression: typeSecurityExpression,
    });

    expect(nextState).toBe(state);
    expect(nextState.filterExpressions.size).toBe(1);
  });

  it('does not update when the new expression collides with another filter key', () => {
    const observabilityExpression = {
      operator: FilterOperator.EQUALS,
      tagName: '_type',
      tagValue: 'observability',
    } as const;

    const state = createState({
      filterExpressions: createFilterExpressions([
        [typeSecurityExpression],
        [observabilityExpression],
      ]),
    });

    const nextState = reducers.updateFilterExpression(state, {
      id: typeSecurityKey,
      expression: observabilityExpression,
    });

    expect(nextState).toBe(state);
  });

  it('re-keys when inverting a filter operator', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    const nextState = reducers.invertFilterExpressionOperator(state, {
      filterId: typeSecurityKey,
    });

    const invertedExpression = {
      operator: FilterOperator.NOT_EQUALS,
      tagName: '_type',
      tagValue: 'security',
    } as const;
    const invertedKey = getFilterExpressionLookupKey(invertedExpression);

    expect(nextState.filterExpressions.has(typeSecurityKey)).toBe(false);
    expect(nextState.filterExpressions.get(invertedKey)).toEqual({
      expression: invertedExpression,
      enabled: true,
    });
  });

  it('does not invert when the inverted filter key already exists', () => {
    const invertedExpression = {
      operator: FilterOperator.NOT_EQUALS,
      tagName: '_type',
      tagValue: 'security',
    } as const;

    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression], [invertedExpression]]),
    });

    const nextState = reducers.invertFilterExpressionOperator(state, {
      filterId: typeSecurityKey,
    });

    expect(nextState).toBe(state);
  });

  it('updates an existing filter expression and re-keys when the expression changes', () => {
    const observabilityExpression = {
      operator: FilterOperator.EQUALS,
      tagName: '_type',
      tagValue: 'observability',
    } as const;

    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    const nextState = reducers.updateFilterExpression(state, {
      id: typeSecurityKey,
      expression: observabilityExpression,
    });

    expect(nextState.filterExpressions).toEqual(
      createFilterExpressions([[observabilityExpression]])
    );
    expect(nextState.filterExpressions.has(typeSecurityKey)).toBe(false);
    expect(nextState.filterExpressions.size).toBe(1);
  });

  it('does not change state when updating a missing filter id', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    const nextState = reducers.updateFilterExpression(state, {
      id: 'missing',
      expression: { operator: FilterOperator.EQUALS, tagName: '_type', tagValue: 'observability' },
    });

    expect(nextState).toBe(state);
  });

  it('removes a filter expression by id', () => {
    const state = createState({
      filterExpressions: createFilterExpressions([
        [typeSecurityExpression],
        [regionUsEastExpression],
      ]),
    });

    const nextState = reducers.removeFilterExpression(state, { filterId: typeSecurityKey });

    expect(nextState.filterExpressions).toEqual(
      createFilterExpressions([[regionUsEastExpression]])
    );
  });

  it('includes all visible project ids when filters are active', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p2', createProject({ _id: 'p2', _type: 'observability' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1'],
      visibleProjectIds: ['p1'],
      excludedOverrides: ['p1'],
    });

    const nextState = reducers.includeAllVisibleProjects(state);

    expect(nextState.excludedOverrides).toEqual([]);
  });

  it('excludes all other visible projects when including only the anchor project', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p2', createProject({ _id: 'p2', _type: 'observability' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      excludedOverrides: ['p3'],
    });

    const nextState = reducers.includeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState.excludedOverrides).toEqual(['p3']);
  });

  it('un-excludes the anchor and excludes other visible projects when anchor was excluded', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p2', createProject({ _id: 'p2', _type: 'observability' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      excludedOverrides: ['p1', 'p3'],
    });

    const nextState = reducers.includeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState.excludedOverrides).toEqual(['p3']);
  });

  it('does not change state when including only the anchor project is a no-op', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      excludedOverrides: ['p3'],
    });

    const nextState = reducers.includeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState).toBe(state);
  });

  it('does not clear project filters when there are no filter expressions', () => {
    const state = createState({
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
      excludedOverrides: ['p2'],
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
    });

    const nextState = reducers.excludeSelectedProjects(state, { projects: ['p1'] });

    expect(nextState.excludedOverrides).toEqual(['p1']);
  });

  it('excludes the anchor project and includes all other visible projects', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      selectedProjects: ['p1', 'p3'],
      excludedOverrides: [],
    });

    const nextState = reducers.excludeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState.excludedOverrides).toEqual(['p1']);
  });

  it('includes other visible projects when the anchor project is already excluded', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      selectedProjects: ['p3'],
      excludedOverrides: ['p1', 'p3'],
    });

    const nextState = reducers.excludeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState.excludedOverrides).toEqual(['p1']);
  });

  it('does not change state when excluding only the anchor project is a no-op', () => {
    const state = createState({
      availableProjects: new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p3', createProject({ _id: 'p3', _type: 'security' })],
      ]),
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1', 'p3'],
      visibleProjectIds: ['p1', 'p3'],
      selectedProjects: ['p3'],
      excludedOverrides: ['p1'],
    });

    const nextState = reducers.excludeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

    expect(nextState).toBe(state);
  });
});
