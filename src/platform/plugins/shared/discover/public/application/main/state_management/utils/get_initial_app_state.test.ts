/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { Filter } from '@kbn/es-query';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { getInitialAppState } from './get_initial_app_state';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

describe('getInitialAppState', () => {
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
    const appState = getInitialAppState({
      initialUrlState: undefined,
      savedSearch: localSavedSearchMock,
      services: createDiscoverServicesMock(),
    });
    expect(appState).toMatchObject(
      expect.objectContaining({
        breakdownField: 'customBreakDownField',
        columns: ['default_column'],
        filters: [customFilter],
        grid: undefined,
        hideChart: true,
        dataSource: createDataViewDataSource({ dataViewId: 'the-data-view-id' }),
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
    const services = createDiscoverServicesMock();
    services.data.query.queryString.getDefaultQuery = jest.fn().mockReturnValue(defaultQuery);
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
    const appState = getInitialAppState({
      initialUrlState: undefined,
      savedSearch: newSavedSearchMock,
      services,
    });
    expect(appState).toMatchObject(
      expect.objectContaining({
        breakdownField: undefined,
        columns: ['default_column'],
        filters: [customFilter],
        grid: undefined,
        hideChart: undefined,
        dataSource: createDataViewDataSource({ dataViewId: 'the-data-view-id' }),
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
