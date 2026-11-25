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
  const filterExpressions = overrides.filterExpressions ?? new Map();

  return {
    controlsState: 'enabled',
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
    filterExpressions,
    filteringDimensions: [],
    availableProjects,
    excludedOverrides: [],
    proposedFilters: null,
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjectIds: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    displayedFilterExpressions: filterExpressions,
    isFilterProposalPending: false,
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
    it('proposes clearing tag filters without touching committed state or project exclusions', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: ['p2'],
      });

      const nextState = reducers.clearProjectFilters(state);

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.filteredProjectIds).toBe(state.filteredProjectIds);
      expect(nextState.proposedFilters).toEqual({
        filterExpressions: new Map(),
        excludedOverrides: ['p2'],
      });
      expect(nextState.excludedOverrides).toEqual(['p2']);
    });

    it('does not propose a change when there are no filter expressions', () => {
      const state = createState({
        excludedOverrides: ['p2'],
      });

      const nextState = reducers.clearProjectFilters(state);

      expect(nextState).toBe(state);
    });

    it('does not propose a change when a pending proposal already has no filters', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        proposedFilters: { filterExpressions: new Map(), excludedOverrides: [] },
      });

      const nextState = reducers.clearProjectFilters(state);

      expect(nextState).toBe(state);
    });
  });

  describe('#revertToSpaceDefaults', () => {
    it('proposes space-default filters and overrides without touching committed state', () => {
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

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.excludedOverrides).toEqual(['p1']);
      expect(nextState.proposedFilters?.filterExpressions.get(typeSecurityKey)).toEqual({
        expression: typeSecurityExpression,
        enabled: true,
      });
      expect(nextState.proposedFilters?.excludedOverrides).toEqual(['p2']);
    });

    it('does not propose a change when already using space defaults', () => {
      const state = createState({
        defaultProjectRouting: '_type:security AND (_id:* AND NOT _id:p2)',
        availableProjects: new Map([
          ['p1', createProject({ _id: 'p1' })],
          ['p2', createProject({ _id: 'p2' })],
        ]),
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: ['p2'],
      });

      const nextState = reducers.revertToSpaceDefaults(state);

      expect(nextState).toBe(state);
    });
  });

  describe('#addFilterExpression', () => {
    it('proposes the added filter expression without touching committed state or overrides', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: ['p1'],
      });

      const nextState = reducers.addFilterExpression(state, {
        expression: { operator: FilterOperator.EQUALS, tagName: '_region', tagValue: 'us-east-1' },
      });

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.excludedOverrides).toEqual(['p1']);
      expect(nextState.proposedFilters?.filterExpressions.size).toBe(2);
      expect(nextState.proposedFilters?.filterExpressions.get(typeSecurityKey)).toEqual({
        expression: typeSecurityExpression,
        enabled: true,
      });
      expect(
        [...(nextState.proposedFilters?.filterExpressions.values() ?? [])].map(
          (entry) => entry.expression
        )
      ).toContainEqual({
        operator: FilterOperator.EQUALS,
        tagName: '_region',
        tagValue: 'us-east-1',
      });
      expect(nextState.proposedFilters?.excludedOverrides).toEqual(['p1']);
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

    it('stacks a second add on top of a still-pending proposal instead of the committed state', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      const afterFirstAdd = reducers.addFilterExpression(state, {
        expression: regionUsEastExpression,
      });
      const afterSecondAdd = reducers.addFilterExpression(afterFirstAdd, {
        expression: { operator: FilterOperator.EQUALS, tagName: '_organisation', tagValue: 'acme' },
      });

      // still untouched — proposals only ever commit atomically via `_commitProposedFilters`
      expect(afterSecondAdd.filterExpressions).toBe(state.filterExpressions);
      expect(afterSecondAdd.proposedFilters?.filterExpressions.size).toBe(3);
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

    it('proposes the updated filter expression, re-keyed, without touching committed state', () => {
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

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.proposedFilters?.filterExpressions).toEqual(
        createFilterExpressions([[observabilityExpression]])
      );
      expect(nextState.proposedFilters?.filterExpressions.has(typeSecurityKey)).toBe(false);
      expect(nextState.proposedFilters?.filterExpressions.size).toBe(1);
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
    it('proposes the re-keyed inverted filter without touching committed state', () => {
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

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.proposedFilters?.filterExpressions.has(typeSecurityKey)).toBe(false);
      expect(nextState.proposedFilters?.filterExpressions.get(invertedKey)).toEqual({
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
    it('proposes removing a filter expression by id without touching committed state', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([
          [typeSecurityExpression],
          [regionUsEastExpression],
        ]),
      });

      const nextState = reducers.removeFilterExpression(state, { filterId: typeSecurityKey });

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.proposedFilters?.filterExpressions).toEqual(
        createFilterExpressions([[regionUsEastExpression]])
      );
    });
  });

  describe('#_commitProposedFilters', () => {
    it('applies the proposal to committed state, sets filteredProjectIds, and clears the proposal', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: ['p2'],
        proposedFilters: {
          filterExpressions: createFilterExpressions([[regionUsEastExpression]]),
          excludedOverrides: ['p3'],
        },
        isFilterSearchLoading: true,
        filterSearchError: new Error('previous failure'),
      });

      const nextState = reducers._commitProposedFilters(state, {
        filteredProjectIds: ['p1'],
      });

      expect(nextState.filterExpressions).toEqual(
        createFilterExpressions([[regionUsEastExpression]])
      );
      expect(nextState.excludedOverrides).toEqual(['p3']);
      expect(nextState.filteredProjectIds).toEqual(['p1']);
      expect(nextState.proposedFilters).toBeNull();
      expect(nextState.filterSearchError).toBeNull();
      expect(nextState.isFilterSearchLoading).toBe(false);
    });

    it('is a no-op when there is no pending proposal', () => {
      const state = createState({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1'],
      });

      const nextState = reducers._commitProposedFilters(state, {
        filteredProjectIds: ['p2'],
      });

      expect(nextState).toBe(state);
    });
  });

  describe('#_setFilterSearchLoading', () => {
    it('sets isFilterSearchLoading and clears any previous error', () => {
      const state = createState({
        proposedFilters: {
          filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
          excludedOverrides: [],
        },
        filterSearchError: new Error('previous failure'),
      });

      const nextState = reducers._setFilterSearchLoading(state);

      expect(nextState.isFilterSearchLoading).toBe(true);
      expect(nextState.filterSearchError).toBeNull();
      expect(nextState.proposedFilters).toBe(state.proposedFilters);
    });

    it('is a no-op when already loading with no error', () => {
      const state = createState({ isFilterSearchLoading: true, filterSearchError: null });

      const nextState = reducers._setFilterSearchLoading(state);

      expect(nextState).toBe(state);
    });
  });

  describe('#_setFilterSearchError', () => {
    it('records the error, stops loading, and leaves the pending proposal intact', () => {
      const proposedFilters = {
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        excludedOverrides: [],
      };
      const state = createState({ proposedFilters, isFilterSearchLoading: true });
      const error = new Error('search failed');

      const nextState = reducers._setFilterSearchError(state, { error });

      expect(nextState.filterSearchError).toBe(error);
      expect(nextState.isFilterSearchLoading).toBe(false);
      expect(nextState.proposedFilters).toBe(proposedFilters);
    });
  });

  describe('#_setStoreState rehydration through the propose/commit pipeline', () => {
    it('stages differing incoming filters as a proposal instead of committing them directly', () => {
      const availableProjects = new Map([
        ['p1', createProject({ _id: 'p1' })],
        ['p2', createProject({ _id: 'p2' })],
      ]);
      const state = createState({
        availableProjects,
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1'],
      });

      const nextState = reducers._setStoreState(state, {
        availableProjects,
        filterExpressions: [regionUsEastExpression],
        excludedOverrides: [],
      });

      expect(nextState.filterExpressions).toBe(state.filterExpressions);
      expect(nextState.filteredProjectIds).toBe(state.filteredProjectIds);
      expect(nextState.proposedFilters?.filterExpressions).toEqual(
        createFilterExpressions([[regionUsEastExpression]])
      );
    });

    it('does not stage a proposal when the incoming filters match the committed ones', () => {
      const availableProjects = new Map([['p1', createProject({ _id: 'p1' })]]);
      const state = createState({
        availableProjects,
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      const nextState = reducers._setStoreState(state, {
        availableProjects,
        filterExpressions: [typeSecurityExpression],
        excludedOverrides: [],
      });

      expect(nextState.proposedFilters).toBeNull();
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

  describe('#_setProjectRoutingStrategy', () => {
    it('updates the strategy without setting hasUserModifiedRouting', () => {
      const state = createState({ projectRoutingStrategy: 'dynamic' });

      const nextState = reducers._setProjectRoutingStrategy(state, {
        projectRoutingStrategy: 'snapshot',
      });

      expect(nextState.projectRoutingStrategy).toBe('snapshot');
      expect(nextState.hasUserModifiedRouting).toBe(false);
    });

    it('is a no-op when the strategy is unchanged', () => {
      const state = createState({ projectRoutingStrategy: 'snapshot' });

      const nextState = reducers._setProjectRoutingStrategy(state, {
        projectRoutingStrategy: 'snapshot',
      });

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
      const afterCommit = reducers._commitProposedFilters(rehydrated, {
        filteredProjectIds: [],
      });
      const afterControls = reducers._setControlsState(afterCommit, {
        controlsState: 'disabled',
      });

      expect(afterControls.hasUserModifiedRouting).toBe(true);
    });
  });
});
