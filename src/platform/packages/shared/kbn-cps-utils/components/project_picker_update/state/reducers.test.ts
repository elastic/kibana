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
import { PROJECT_SELECTION_DIMENSION } from '../utils';

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
    controlsState: 'enabled',
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
    filterExpressions: new Map(),
    filteringDimensions: [],
    availableProjects,
    excludedOverrides: [],
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjectIds: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    ...overrides,
  };
};

describe('createStoreReducers', () => {
  const reducers = createStoreReducers();

  describe('#undoProjectExclusion', () => {
    it('updates override fields instead of selectedProjectIds', () => {
      const state = createState({
        availableProjects: new Map([['p1', createProject({ _id: 'p1' })]]),
        excludedOverrides: ['p1'],
      });

      const nextState = reducers.undoProjectExclusion(state, { projects: ['p1'] });

      expect(nextState.excludedOverrides).toEqual([]);
    });
  });

  describe('#clearProjectFilters', () => {
    it('clears stored tag filters without clearing project exclusions', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: ['p2'],
      });

      const nextState = reducers.clearProjectFilters(state);

      expect(nextState.filterExpressions).toEqual(new Map());
      expect(nextState.excludedOverrides).toEqual(['p2']);
    });

    it('does not clear project exclusions when there are no filter expressions', () => {
      const state = createState({
        excludedOverrides: ['p2'],
      });

      const nextState = reducers.clearProjectFilters(state);

      expect(nextState).toBe(state);
    });
  });

  describe('#revertToSpaceDefaults', () => {
    it('resets filters and overrides when reverting to space defaults', () => {
      const state = createState({
        defaultProjectRouting: '_type:security AND (_id:* AND NOT _id:p2)',
        availableProjects: new Map([
          ['p1', createProject({ _id: 'p1' })],
          ['p2', createProject({ _id: 'p2' })],
        ]),
        filterExpressions: createFilterExpressions([[regionUsEastExpression]]),
        excludedOverrides: ['p1'],
      });

      const nextState = reducers.revertToSpaceDefaults(state);

      expect(nextState.filterExpressions.get(typeSecurityKey)).toEqual({
        expression: typeSecurityExpression,
        enabled: true,
      });
      expect(nextState.excludedOverrides).toEqual(['p2']);
    });
  });

  describe('#addFilterExpression', () => {
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

    it('rejects filter expressions that target the project selection dimension', () => {
      const state = createState();

      const nextState = reducers.addFilterExpression(state, {
        expression: {
          operator: FilterOperator.EQUALS,
          tagName: PROJECT_SELECTION_DIMENSION,
          tagValue: 'p1',
        },
      });

      expect(nextState).toBe(state);
    });
  });

  describe('#updateFilterExpression', () => {
    it('rejects updating a filter expression to target the project selection dimension', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      const nextState = reducers.updateFilterExpression(state, {
        id: typeSecurityKey,
        expression: {
          operator: FilterOperator.EQUALS,
          tagName: PROJECT_SELECTION_DIMENSION,
          tagValue: 'p1',
        },
      });

      expect(nextState).toBe(state);
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
        expression: {
          operator: FilterOperator.EQUALS,
          tagName: '_type',
          tagValue: 'observability',
        },
      });

      expect(nextState).toBe(state);
    });
  });

  describe('#invertFilterExpressionOperator', () => {
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
        filterExpressions: createFilterExpressions([
          [typeSecurityExpression],
          [invertedExpression],
        ]),
      });

      const nextState = reducers.invertFilterExpressionOperator(state, {
        filterId: typeSecurityKey,
      });

      expect(nextState).toBe(state);
    });
  });

  describe('#removeFilterExpression', () => {
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
  });

  describe('#includeAllVisibleProjects', () => {
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
  });

  describe('#includeOnlyProvidedProjectId', () => {
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
  });

  describe('#excludeSelectedProjects', () => {
    it('does not exclude the last included visible project', () => {
      const state = createState({
        availableProjects: new Map([
          ['p1', createProject({ _id: 'p1' })],
          ['p2', createProject({ _id: 'p2' })],
        ]),
        visibleProjectIds: ['p1', 'p2'],
        selectedProjectIds: ['p1'],
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
        selectedProjectIds: ['p1', 'p2'],
      });

      const nextState = reducers.excludeSelectedProjects(state, { projects: ['p1'] });

      expect(nextState.excludedOverrides).toEqual(['p1']);
    });
  });

  describe('#excludeOnlyProvidedProjectId', () => {
    it('excludes the anchor project and includes all other visible projects', () => {
      const state = createState({
        availableProjects: new Map([
          ['p1', createProject({ _id: 'p1', _type: 'security' })],
          ['p3', createProject({ _id: 'p3', _type: 'security' })],
        ]),
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1', 'p3'],
        visibleProjectIds: ['p1', 'p3'],
        selectedProjectIds: ['p1', 'p3'],
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
        selectedProjectIds: ['p3'],
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
        selectedProjectIds: ['p3'],
        excludedOverrides: ['p1'],
      });

      const nextState = reducers.excludeOnlyProvidedProjectId(state, { anchorProjectId: 'p1' });

      expect(nextState).toBe(state);
    });
  });

  describe('hasUserModifiedRouting', () => {
    it('is set when a public reducer changes state', () => {
      const state = createState();

      const nextState = reducers.addFilterExpression(state, {
        expression: typeSecurityExpression,
      });

      expect(state.hasUserModifiedRouting).toBe(false);
      expect(nextState.hasUserModifiedRouting).toBe(true);
    });

    it('is not set when a public reducer no-ops', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      const duplicateAdd = reducers.addFilterExpression(state, {
        expression: typeSecurityExpression,
      });
      const selectionDimensionAdd = reducers.addFilterExpression(state, {
        expression: {
          operator: FilterOperator.EQUALS,
          tagName: PROJECT_SELECTION_DIMENSION,
          tagValue: 'p1',
        },
      });

      expect(duplicateAdd.hasUserModifiedRouting).toBe(false);
      expect(selectionDimensionAdd.hasUserModifiedRouting).toBe(false);
    });

    it('remains set across subsequent actions once flipped', () => {
      const state = createState();

      const afterAdd = reducers.addFilterExpression(state, {
        expression: typeSecurityExpression,
      });
      const afterClear = reducers.clearProjectFilters(afterAdd);

      expect(afterClear.hasUserModifiedRouting).toBe(true);
    });

    it('is not set by internal reducers and is preserved through rehydration', () => {
      const availableProjects = new Map([['p1', createProject({ _id: 'p1' })]]);
      const pristine = createState({ availableProjects });

      const afterInternal = reducers._setStoreState(pristine, { availableProjects });
      expect(afterInternal.hasUserModifiedRouting).toBe(false);

      const modified = reducers.addFilterExpression(pristine, {
        expression: typeSecurityExpression,
      });
      const rehydrated = reducers._setStoreState(modified, { availableProjects });
      const afterSearchResult = reducers._setFilterSearchResult(rehydrated, {
        isFilterSearchLoading: false,
        filterSearchError: null,
      });
      const afterControls = reducers._setControlsState(afterSearchResult, {
        controlsState: 'disabled',
      });

      expect(afterControls.hasUserModifiedRouting).toBe(true);
    });
  });
});
