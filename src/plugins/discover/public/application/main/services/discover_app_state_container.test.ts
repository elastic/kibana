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
} from './discover_app_state_container';
import { SavedSearch } from '@kbn/saved-search-plugin/common';

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
});
