/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { Filter } from '@kbn/es-query';
import { getInitialAppState } from './get_initial_app_state';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import { fromTabStateToSavedObjectTab } from '../redux';

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

  test('should return correct output', () => {
    const services = createDiscoverServicesMock();
    const persistedTab = fromTabStateToSavedObjectTab({
      tab: getTabStateMock({
        id: 'the-saved-search-id',
        label: 'A saved search',
        appState: {
          breakdownField: 'customBreakDownField',
          hideChart: true,
          rowsPerPage: 250,
          hideAggregatedPreview: true,
        },
        initialInternalState: {
          serializedSearchSource: {
            index: dataViewMock.id,
            filter: [customFilter],
            query: customQuery,
          },
        },
      }),
      timeRestore: false,
      services,
    });
    const appState = getInitialAppState({
      initialUrlState: undefined,
      persistedTab,
      dataView: dataViewMock,
      services,
    });
    expect(appState).toMatchObject(
      expect.objectContaining({
        breakdownField: 'customBreakDownField',
        columns: ['default_column'],
        filters: [customFilter],
        grid: {},
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
    const persistedTab = fromTabStateToSavedObjectTab({
      tab: getTabStateMock({
        id: 'new-saved-search-id',
        label: 'A saved search',
        initialInternalState: {
          serializedSearchSource: {
            index: dataViewMock.id,
            filter: [customFilter],
            query: undefined,
          },
        },
      }),
      timeRestore: false,
      services,
    });
    const appState = getInitialAppState({
      initialUrlState: undefined,
      persistedTab,
      dataView: dataViewMock,
      services,
    });
    expect(appState).toMatchObject(
      expect.objectContaining({
        breakdownField: undefined,
        columns: ['default_column'],
        filters: [customFilter],
        grid: {},
        hideChart: false,
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
