/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getQueryParameterActions } from './actions';
import { FilterManager, SortDirection } from '../../../../../../data/public';
import { coreMock } from '../../../../../../../core/public/mocks';
import { ContextAppState, LoadingStatus, QueryParameters } from '../../context_app_state';
import { EsHitRecord } from '../api/context';
const setupMock = coreMock.createSetup();

let state: ContextAppState;
let filterManager: FilterManager;
let filterManagerSpy: jest.SpyInstance;

beforeEach(() => {
  filterManager = new FilterManager(setupMock.uiSettings);
  filterManagerSpy = jest.spyOn(filterManager, 'addFilters');

  state = {
    queryParameters: {
      defaultStepSize: 3,
      indexPatternId: 'INDEX_PATTERN_ID',
      predecessorCount: 10,
      successorCount: 10,
      anchorId: '',
      columns: [],
      filters: [],
      sort: [['field', SortDirection.asc]],
      tieBreakerField: '',
    },
    loadingStatus: {
      anchor: LoadingStatus.UNINITIALIZED,
      predecessors: LoadingStatus.UNINITIALIZED,
      successors: LoadingStatus.UNINITIALIZED,
    },
    rows: {
      all: [],
      anchor: ({ isAnchor: true, fields: [], sort: [], _id: '' } as unknown) as EsHitRecord,
      predecessors: [],
      successors: [],
    },
    useNewFieldsApi: true,
  };
});

describe('context query_parameter actions', function () {
  describe('action addFilter', () => {
    it('should pass the given arguments to the filterManager', () => {
      const { addFilter } = getQueryParameterActions(filterManager);

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      // get the generated filter
      const generatedFilter = filterManagerSpy.mock.calls[0][0][0];
      const queryKeys = Object.keys(generatedFilter.query.match_phrase);
      expect(filterManagerSpy.mock.calls.length).toBe(1);
      expect(queryKeys[0]).toBe('FIELD_NAME');
      expect(generatedFilter.query.match_phrase[queryKeys[0]]).toBe('FIELD_VALUE');
    });

    it('should pass the index pattern id to the filterManager', () => {
      const { addFilter } = getQueryParameterActions(filterManager);
      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');
      const generatedFilter = filterManagerSpy.mock.calls[0][0][0];
      expect(generatedFilter.meta.index).toBe('INDEX_PATTERN_ID');
    });
  });
  describe('action setPredecessorCount', () => {
    it('should set the predecessorCount to the given value', () => {
      const { setPredecessorCount } = getQueryParameterActions(filterManager);
      setPredecessorCount(state)(20);
      expect(state.queryParameters.predecessorCount).toBe(20);
    });

    it('should limit the predecessorCount to 0 as a lower bound', () => {
      const { setPredecessorCount } = getQueryParameterActions(filterManager);
      setPredecessorCount(state)(-1);
      expect(state.queryParameters.predecessorCount).toBe(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', () => {
      const { setPredecessorCount } = getQueryParameterActions(filterManager);
      setPredecessorCount(state)(20000);
      expect(state.queryParameters.predecessorCount).toBe(10000);
    });
  });
  describe('action setSuccessorCount', () => {
    it('should set the successorCount to the given value', function () {
      const { setSuccessorCount } = getQueryParameterActions(filterManager);
      setSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).toBe(20);
    });

    it('should limit the successorCount to 0 as a lower bound', () => {
      const { setSuccessorCount } = getQueryParameterActions(filterManager);
      setSuccessorCount(state)(-1);
      expect(state.queryParameters.successorCount).toBe(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', () => {
      const { setSuccessorCount } = getQueryParameterActions(filterManager);
      setSuccessorCount(state)(20000);
      expect(state.queryParameters.successorCount).toBe(10000);
    });
  });
  describe('action setQueryParameters', function () {
    const { setQueryParameters } = getQueryParameterActions(filterManager);

    it('should update the queryParameters with valid properties from the given object', function () {
      const newState = {
        ...state,
        queryParameters: {
          ...state.queryParameters,
          additionalParameter: 'ADDITIONAL_PARAMETER',
        },
      };

      const actualState = setQueryParameters(newState)({
        anchorId: 'ANCHOR_ID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: [],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: [['field', SortDirection.asc]],
        tieBreakerField: '',
      });

      expect(actualState).toEqual({
        additionalParameter: 'ADDITIONAL_PARAMETER',
        anchorId: 'ANCHOR_ID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: [],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: [['field', SortDirection.asc]],
        tieBreakerField: '',
      });
    });

    it('should ignore invalid properties', function () {
      const newState = { ...state };

      setQueryParameters(newState)(({
        additionalParameter: 'ADDITIONAL_PARAMETER',
      } as unknown) as QueryParameters);

      expect(state.queryParameters).toEqual(newState.queryParameters);
    });
  });
});
