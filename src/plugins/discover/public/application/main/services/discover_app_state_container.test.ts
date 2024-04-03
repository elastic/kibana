/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import type { Filter } from '@kbn/es-query';
import { History } from 'history';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
  isEqualState,
} from './discover_app_state_container';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/common';

let history: History;
let state: DiscoverAppStateContainer;

describe('Test discover app state container', () => {
  beforeEach(async () => {
    const storeInSessionStorage = discoverServiceMock.uiSettings.get('state:storeInSessionStorage');
    const toasts = discoverServiceMock.core.notifications.toasts;
    const stateStorage = createKbnUrlStateStorage({
      useHash: storeInSessionStorage,
      history,
      ...(toasts && withNotifyOnErrors(toasts)),
    });
    state = getDiscoverAppStateContainer({
      stateStorage,
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
    });
  });

  test('hasChanged returns whether the current state has changed', async () => {
    state.set({ index: 'modified' });
    expect(state.hasChanged()).toBeTruthy();
    state.resetInitialState();
    expect(state.hasChanged()).toBeFalsy();
  });

  test('getPrevious returns the state before the current', async () => {
    state.set({ index: 'first' });
    const stateA = state.getState();
    state.set({ index: 'second' });
    expect(state.getPrevious()).toEqual(stateA);
  });

  describe('getAppStateFromSavedSearch', () => {
    const customQuery = {
      language: 'kuery',
      query: '_id: *',
    };

    const defaultQuery = {
      query: '*',
      language: 'kuery',
    };

    const customFilter = {
      $state: {
        store: 'appState',
      },
      meta: {
        alias: null,
        disabled: false,
        field: 'ecs.version',
        index: 'kibana-event-log-data-view',
        key: 'ecs.version',
        negate: false,
        params: {
          query: '1.8.0',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'ecs.version': '1.8.0',
        },
      },
    } as Filter;

    const localSavedSearchMock = {
      id: 'the-saved-search-id',
      title: 'A saved search',
      breakdownField: 'customBreakDownField',
      searchSource: createSearchSourceMock({
        index: dataViewMock,
        filter: [customFilter],
        query: customQuery,
      }),
      hideChart: true,
      rowsPerPage: 250,
      hideAggregatedPreview: true,
      managed: false,
    } as SavedSearch;

    test('should return correct output', () => {
      const appState = state.getAppStateFromSavedSearch(localSavedSearchMock);
      expect(appState).toMatchObject(
        expect.objectContaining({
          breakdownField: 'customBreakDownField',
          columns: ['default_column'],
          filters: [customFilter],
          grid: undefined,
          hideChart: true,
          index: 'the-data-view-id',
          interval: 'auto',
          query: customQuery,
          rowHeight: undefined,
          headerRowHeight: undefined,
          rowsPerPage: 250,
          hideAggregatedPreview: true,
          savedQuery: undefined,
          sort: [],
          viewMode: undefined,
        })
      );
    });

    test('should return default query if query is undefined', () => {
      discoverServiceMock.data.query.queryString.getDefaultQuery = jest
        .fn()
        .mockReturnValue(defaultQuery);
      const newSavedSearchMock = {
        id: 'new-saved-search-id',
        title: 'A saved search',
        searchSource: createSearchSourceMock({
          index: dataViewMock,
          filter: [customFilter],
          query: undefined,
        }),
        managed: false,
      };
      const appState = state.getAppStateFromSavedSearch(newSavedSearchMock);
      expect(appState).toMatchObject(
        expect.objectContaining({
          breakdownField: undefined,
          columns: ['default_column'],
          filters: [customFilter],
          grid: undefined,
          hideChart: undefined,
          index: 'the-data-view-id',
          interval: 'auto',
          query: defaultQuery,
          rowHeight: undefined,
          headerRowHeight: undefined,
          rowsPerPage: undefined,
          hideAggregatedPreview: undefined,
          savedQuery: undefined,
          sort: [],
          viewMode: undefined,
        })
      );
    });
  });

  describe('isEqualState', () => {
    const initialState = {
      index: 'the-index',
      columns: ['the-column'],
      sort: [],
      query: { query: 'the-query', language: 'kuery' },
      filters: [],
      interval: 'auto',
      hideChart: true,
      sampleSize: 100,
      viewMode: VIEW_MODE.DOCUMENT_LEVEL,
      savedQuery: undefined,
      hideAggregatedPreview: true,
      rowHeight: 25,
      headerRowHeight: 25,
      grid: {},
      breakdownField: 'the-breakdown-field',
    };

    test('returns true if the states are equal', () => {
      expect(isEqualState(initialState, { ...initialState })).toBeTruthy();
    });

    test('handles the special filter change case correctly ', () => {
      // this is some sort of legacy behavior, especially for the filter case
      const previousState = { initialState, filters: [{ index: 'test', meta: {} }] };
      const nextState = {
        initialState,
        filters: [{ index: 'test', meta: {}, $$hashKey: 'hi' }],
      };
      expect(isEqualState(previousState, nextState)).toBeTruthy();
    });

    test('returns true if the states are not equal', () => {
      const changedParams = [
        { index: 'the-new-index' },
        { columns: ['newColumns'] },
        { sort: [['column', 'desc']] },
        { query: { query: 'ok computer', language: 'pirate-english' } },
        { filters: [{ index: 'test', meta: {} }] },
        { interval: 'eternity' },
        { hideChart: undefined },
        { sampleSize: 1 },
        { viewMode: undefined },
        { savedQuery: 'sdsd' },
        { hideAggregatedPreview: false },
        { rowHeight: 100 },
        { headerRowHeight: 1 },
        { grid: { test: 'test' } },
        { breakdownField: 'new-breakdown-field' },
      ];
      changedParams.forEach((param) => {
        expect(isEqualState(initialState, { ...initialState, ...param })).toBeFalsy();
      });
    });
    test('allows to exclude variables from comparison', () => {
      expect(
        isEqualState(initialState, { ...initialState, index: undefined }, ['index'])
      ).toBeTruthy();
    });
  });
});
