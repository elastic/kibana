/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStateDefaults } from './get_state_defaults';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { savedSearchMock, savedSearchMockWithESQL } from '../../../../__mocks__/saved_search';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';

describe('getStateDefaults', () => {
  test('data view with timefield', () => {
    savedSearchMock.searchSource = createSearchSourceMock({ index: dataViewWithTimefieldMock });
    const actual = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: savedSearchMock,
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
    savedSearchMock.searchSource = createSearchSourceMock({ index: dataViewMock });

    const actual = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: savedSearchMock,
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

  test('should set view mode correctly', () => {
    const actualForUndefinedViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: undefined,
      },
    });
    expect(actualForUndefinedViewMode.viewMode).toBeUndefined();

    const actualForEsqlWithAggregatedViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
    });
    expect(actualForEsqlWithAggregatedViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);

    const actualForEsqlWithInvalidPatternLevelViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
    });
    expect(actualForEsqlWithInvalidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    const actualForEsqlWithValidViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
      },
    });
    expect(actualForEsqlWithValidViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
    expect(actualForEsqlWithValidViewMode.dataSource).toEqual(createEsqlDataSource());

    const actualForWithValidAggLevelViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMock,
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
    });
    expect(actualForWithValidAggLevelViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);
    expect(actualForWithValidAggLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({
        dataViewId: savedSearchMock.searchSource.getField('index')?.id!,
      })
    );

    const actualForWithValidPatternLevelViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMock,
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
    });
    expect(actualForWithValidPatternLevelViewMode.viewMode).toBe(VIEW_MODE.PATTERN_LEVEL);
    expect(actualForWithValidPatternLevelViewMode.dataSource).toEqual(
      createDataViewDataSource({
        dataViewId: savedSearchMock.searchSource.getField('index')?.id!,
      })
    );
  });

  test('should return expected dataSource', () => {
    const actualForEsql = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: savedSearchMockWithESQL,
    });
    expect(actualForEsql.dataSource).toMatchInlineSnapshot(`
      Object {
        "type": "esql",
      }
    `);
    const actualForDataView = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: savedSearchMock,
    });
    expect(actualForDataView.dataSource).toMatchInlineSnapshot(`
      Object {
        "dataViewId": "the-data-view-id",
        "type": "dataView",
      }
    `);
  });
});
