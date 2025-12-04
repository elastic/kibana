/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStateDefaults } from './get_state_defaults';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import type { DiscoverServices } from '../../../../build_services';
import { fromTabStateToSavedObjectTab } from '../redux';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';

describe('getStateDefaults', () => {
  test('data view with timefield', () => {
    const services = createDiscoverServicesMock();
    const actual = getStateDefaults({
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
    const actual = getStateDefaults({
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
    const actualForUndefinedViewMode = getStateDefaults({
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: undefined,
      },
      dataView: dataViewMock,
      services,
    });
    expect(actualForUndefinedViewMode.viewMode).toBeUndefined();

    const actualForEsqlWithAggregatedViewMode = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
    });
    expect(actualForEsqlWithAggregatedViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);

    const actualForEsqlWithInvalidPatternLevelViewMode = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.PATTERN_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
    });
    expect(actualForEsqlWithInvalidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    const actualForEsqlWithValidViewMode = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
    });
    expect(actualForEsqlWithValidViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
    expect(actualForEsqlWithValidViewMode.dataSource).toEqual(createEsqlDataSource());

    const actualForWithValidAggLevelViewMode = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
      dataView: dataViewMock,
    });
    expect(actualForWithValidAggLevelViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);
    expect(actualForWithValidAggLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewMock.id! })
    );

    const actualForWithValidPatternLevelViewMode = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
      dataView: dataViewMock,
    });
    expect(actualForWithValidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.PATTERN_LEVEL);
    expect(actualForWithValidPatternLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewMock.id! })
    );
  });

  test('should return expected dataSource', () => {
    const services = createDiscoverServicesMock();
    const actualForEsql = getStateDefaults({
      services,
      persistedTab: {
        ...getPersistedTab({ services }),
        serializedSearchSource: { query: { esql: 'FROM test' } },
      },
      dataView: undefined,
    });
    expect(actualForEsql.dataSource).toMatchInlineSnapshot(`
      Object {
        "type": "esql",
      }
    `);
    const actualForDataView = getStateDefaults({
      services,
      persistedTab: getPersistedTab({ services }),
      dataView: dataViewMock,
    });
    expect(actualForDataView.dataSource).toMatchInlineSnapshot(`
      Object {
        "dataViewId": "the-data-view-id",
        "type": "dataView",
      }
    `);
  });
});
