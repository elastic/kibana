/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStateDefaults } from './get_state_defaults';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { savedSearchMock, savedSearchMockWithESQL } from '../../../../__mocks__/saved_search';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { DataViewDataSource } from '../../../../../common/data_sources';

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

    const actualForTextBasedWithInvalidViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
    });
    expect(actualForTextBasedWithInvalidViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    const actualForTextBasedWithValidViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMockWithESQL,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
      },
    });
    expect(actualForTextBasedWithValidViewMode.viewMode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
    expect((actualForTextBasedWithValidViewMode.dataSource as DataViewDataSource).dataViewId).toBe(
      undefined
    );

    const actualForWithValidViewMode = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: {
        ...savedSearchMock,
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
    });
    expect(actualForWithValidViewMode.viewMode).toBe(VIEW_MODE.AGGREGATED_LEVEL);
    expect((actualForWithValidViewMode.dataSource as DataViewDataSource).dataViewId).toBe(
      savedSearchMock.searchSource.getField('index')?.id
    );
  });

  test('should return expected dataSource', () => {
    const actualForTextBased = getStateDefaults({
      services: discoverServiceMock,
      savedSearch: savedSearchMockWithESQL,
    });
    expect(actualForTextBased.dataSource).toMatchInlineSnapshot(`
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
