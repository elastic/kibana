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
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import { fromTabStateToSavedObjectTab } from '../redux';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import type { DiscoverServices } from '../../../../build_services';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { getInitialState } from '../discover_app_state_container';

describe('getInitialState', () => {
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
        initialAppState: {
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
    const appState = getInitialState({
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
    const appState = getInitialState({
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

  test('data view with timefield', () => {
    const services = createDiscoverServicesMock();
    const actual = getInitialState({
      initialUrlState: undefined,
      persistedTab: undefined,
      dataView: dataViewWithTimefieldMock,
      services,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "columns": Array [
          "default_column",
        ],
        "dataSource": Object {
          "dataViewId": "index-pattern-with-timefield-id",
          "type": "dataView",
        },
        "density": undefined,
        "filters": undefined,
        "grid": undefined,
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "sampleSize": undefined,
        "savedQuery": undefined,
        "sort": Array [
          Array [
            "timestamp",
            "desc",
          ],
        ],
        "viewMode": undefined,
      }
    `);
  });

  test('data view without timefield', () => {
    const services = createDiscoverServicesMock();
    const actual = getInitialState({
      initialUrlState: undefined,
      persistedTab: undefined,
      dataView: dataViewMock,
      services,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "columns": Array [
          "default_column",
        ],
        "dataSource": Object {
          "dataViewId": "the-data-view-id",
          "type": "dataView",
        },
        "density": undefined,
        "filters": undefined,
        "grid": undefined,
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "sampleSize": undefined,
        "savedQuery": undefined,
        "sort": Array [],
        "viewMode": undefined,
      }
    `);
  });

  const getPersistedTab = ({ services }: { services: DiscoverServices }) =>
    fromTabStateToSavedObjectTab({
      tab: getTabStateMock({ id: 'mock-tab' }),
      timeRestore: false,
      services,
    });

  test('should set view mode correctly', () => {
    const services = createDiscoverServicesMock();
    const actualForUndefinedViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: undefined,
      },
      dataView: dataViewMock,
      services,
    });
    expect(actualForUndefinedViewMode.viewMode).toBeUndefined();

    const actualForEsqlWithAggregatedViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
      services,
    });
    expect(actualForEsqlWithAggregatedViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);

    const actualForEsqlWithInvalidPatternLevelViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.PATTERN_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
      services,
    });
    expect(actualForEsqlWithInvalidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    const actualForEsqlWithValidViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
      services,
    });
    expect(actualForEsqlWithValidViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
    expect(actualForEsqlWithValidViewMode.dataSource).toEqual(createEsqlDataSource());

    const actualForWithValidAggLevelViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
      dataView: dataViewMock,
      services,
    });
    expect(actualForWithValidAggLevelViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);
    expect(actualForWithValidAggLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewMock.id! })
    );

    const actualForWithValidPatternLevelViewMode = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
      dataView: dataViewMock,
      services,
    });
    expect(actualForWithValidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.PATTERN_LEVEL);
    expect(actualForWithValidPatternLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewMock.id! })
    );
  });

  test('should return expected dataSource', () => {
    const services = createDiscoverServicesMock();
    const actualForEsql = getInitialState({
      initialUrlState: undefined,
      persistedTab: {
        ...getPersistedTab({ services }),
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
      services,
    });
    expect(actualForEsql.dataSource).toMatchInlineSnapshot(`
      Object {
        "type": "esql",
      }
    `);
    const actualForDataView = getInitialState({
      initialUrlState: undefined,
      persistedTab: getPersistedTab({ services }),
      dataView: dataViewMock,
      services,
    });
    expect(actualForDataView.dataSource).toMatchInlineSnapshot(`
      Object {
        "dataViewId": "the-data-view-id",
        "type": "dataView",
      }
    `);
  });

  describe('default sort array', () => {
    test('should use persistedTab sort array if valid and data view is provided', () => {
      const services = createDiscoverServicesMock();
      const appState = getInitialState({
        initialUrlState: undefined,
        persistedTab: {
          ...getPersistedTab({ services }),
          sort: [['timestamp', 'asc']],
        },
        dataView: dataViewWithTimefieldMock,
        services,
      });
      expect(appState.sort).toEqual([['timestamp', 'asc']]);
    });

    test('should not use persistedTab sort array if invalid and data view is provided', () => {
      const services = createDiscoverServicesMock();
      const appState = getInitialState({
        initialUrlState: undefined,
        persistedTab: {
          ...getPersistedTab({ services }),
          sort: [['test', 'desc']],
        },
        dataView: dataViewWithTimefieldMock,
        services,
      });
      expect(appState.sort).toEqual([['timestamp', 'desc']]);
    });

    test('should use persistedTab sort array when data view is not provided', () => {
      const services = createDiscoverServicesMock();
      const appState = getInitialState({
        initialUrlState: undefined,
        persistedTab: {
          ...getPersistedTab({ services }),
          sort: [['test', 'desc']],
        },
        dataView: undefined,
        services,
      });
      expect(appState.sort).toEqual([['test', 'desc']]);
    });

    test('should use persistedTab sort array when partial data view is provided', () => {
      const services = createDiscoverServicesMock();
      const appState = getInitialState({
        initialUrlState: undefined,
        persistedTab: {
          ...getPersistedTab({ services }),
          sort: [['test', 'desc']],
        },
        dataView: { id: 'partial-data-view-id', timeFieldName: 'timestamp' },
        services,
      });
      expect(appState.sort).toEqual([['test', 'desc']]);
    });
  });
});
