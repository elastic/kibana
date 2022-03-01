/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStateDefaults } from './get_state_defaults';
import { createSearchSourceMock, dataPluginMock } from '../../../../../data/public/mocks';
import { uiSettingsMock } from '../../../__mocks__/ui_settings';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { discoverServiceMock } from '../../../__mocks__/services';

describe('getStateDefaults', () => {
  const storage = discoverServiceMock.storage;

  test('index pattern with timefield', () => {
    savedSearchMock.searchSource = createSearchSourceMock({ index: indexPatternWithTimefieldMock });
    const actual = getStateDefaults({
      config: uiSettingsMock,
      data: dataPluginMock.createStartContract(),
      savedSearch: savedSearchMock,
      storage,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "default_column",
        ],
        "filters": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "index": "index-pattern-with-timefield-id",
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
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

  test('index pattern without timefield', () => {
    savedSearchMock.searchSource = createSearchSourceMock({ index: indexPatternMock });

    const actual = getStateDefaults({
      config: uiSettingsMock,
      data: dataPluginMock.createStartContract(),
      savedSearch: savedSearchMock,
      storage,
    });
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "default_column",
        ],
        "filters": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "index": "the-index-pattern-id",
        "interval": "auto",
        "query": undefined,
        "rowHeight": undefined,
        "savedQuery": undefined,
        "sort": Array [],
        "viewMode": undefined,
      }
    `);
  });
});
