/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStateDefaults } from './get_state_defaults';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { dataViewMock } from '../../../__mocks__/data_view';
import { discoverServiceMock } from '../../../__mocks__/services';

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
        "filters": undefined,
        "grid": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "index": "index-pattern-with-timefield-id",
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
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
        "filters": undefined,
        "grid": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "index": "the-data-view-id",
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "savedQuery": undefined,
        "sort": Array [],
        "viewMode": undefined,
      }
    `);
  });
});
