/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities, IUiSettingsClient } from 'kibana/public';
import type { DataView } from 'src/plugins/data_views/public';
import type { DiscoverServices } from '../build_services';
import { dataPluginMock } from '../../../data/public/mocks';
import { createSearchSourceMock } from '../../../data/common/search/search_source/mocks';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../common';
import { indexPatternMock } from '../__mocks__/index_pattern';
import { getSharingData, showPublicUrlSwitch } from './get_sharing_data';

describe('getSharingData', () => {
  let services: DiscoverServices;

  beforeEach(() => {
    services = {
      data: dataPluginMock.createStartContract(),
      uiSettings: {
        get: (key: string) => {
          if (key === SEARCH_FIELDS_FROM_SOURCE) {
            return false;
          }
          if (key === SORT_DEFAULT_ORDER_SETTING) {
            return 'desc';
          }
          if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
            return false;
          }
          return false;
        },
      },
    } as DiscoverServices;
  });

  test('returns valid data for sharing', async () => {
    const searchSourceMock = createSearchSourceMock({ index: indexPatternMock });
    const result = await getSharingData(searchSourceMock, { columns: [] }, services);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [],
        "getSearchSource": [Function],
      }
    `);
  });

  test('returns valid data for sharing when columns are selected', async () => {
    const searchSourceMock = createSearchSourceMock({ index: indexPatternMock });
    const result = await getSharingData(
      searchSourceMock,
      { columns: ['column_a', 'column_b'] },
      services
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "column_a",
          "column_b",
        ],
        "getSearchSource": [Function],
      }
    `);
  });

  test('getSearchSource does not add fields to the searchSource', async () => {
    const index = { ...indexPatternMock } as DataView;
    index.timeFieldName = 'cool-timefield';
    const searchSourceMock = createSearchSourceMock({ index });
    const { getSearchSource } = await getSharingData(searchSourceMock, {}, services);
    expect(getSearchSource()).toMatchInlineSnapshot(`
      Object {
        "index": "the-index-pattern-id",
        "sort": Array [
          Object {
            "_doc": "desc",
          },
        ],
      }
    `);
  });

  test(`getSearchSource does not add fields to the searchSource with 'discover:searchFieldsFromSource=true'`, async () => {
    const originalGet = services.uiSettings.get;
    services.uiSettings = {
      get: (key: string, ...args: unknown[]) => {
        if (key === SEARCH_FIELDS_FROM_SOURCE) {
          return true;
        }
        return originalGet(key, ...args);
      },
    } as unknown as IUiSettingsClient;
    const index = { ...indexPatternMock } as DataView;
    index.timeFieldName = 'cool-timefield';
    const searchSourceMock = createSearchSourceMock({ index });
    const { getSearchSource } = await getSharingData(
      searchSourceMock,
      {
        columns: [
          'cool-field-1',
          'cool-field-2',
          'cool-field-3',
          'cool-field-4',
          'cool-field-5',
          'cool-field-6',
        ],
      },
      services
    );
    expect(getSearchSource()).toMatchInlineSnapshot(`
      Object {
        "index": "the-index-pattern-id",
        "sort": Array [
          Object {
            "_doc": "desc",
          },
        ],
      }
    `);
  });

  test('getSearchSource does add fields to the searchSource when columns are selected', async () => {
    const index = { ...indexPatternMock } as DataView;
    index.timeFieldName = 'cool-timefield';
    const searchSourceMock = createSearchSourceMock({ index });
    const { getSearchSource } = await getSharingData(
      searchSourceMock,
      {
        columns: [
          'cool-field-1',
          'cool-field-2',
          'cool-field-3',
          'cool-field-4',
          'cool-field-5',
          'cool-field-6',
        ],
      },
      services
    );
    expect(getSearchSource().fields).toStrictEqual([
      'cool-timefield',
      'cool-field-1',
      'cool-field-2',
      'cool-field-3',
      'cool-field-4',
      'cool-field-5',
      'cool-field-6',
    ]);
  });

  test('fields have prepended timeField', async () => {
    const index = { ...indexPatternMock } as DataView;
    index.timeFieldName = 'cool-timefield';

    const searchSourceMock = createSearchSourceMock({ index });
    const result = await getSharingData(
      searchSourceMock,
      {
        columns: [
          'cool-field-1',
          'cool-field-2',
          'cool-field-3',
          'cool-field-4',
          'cool-field-5',
          'cool-field-6',
        ],
      },
      services
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "cool-timefield",
          "cool-field-1",
          "cool-field-2",
          "cool-field-3",
          "cool-field-4",
          "cool-field-5",
          "cool-field-6",
        ],
        "getSearchSource": [Function],
      }
    `);
  });

  test('fields conditionally do not have prepended timeField', async () => {
    services.uiSettings = {
      get: (key: string) => {
        if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
          return true;
        }
        return false;
      },
    } as unknown as IUiSettingsClient;

    const index = { ...indexPatternMock } as DataView;
    index.timeFieldName = 'cool-timefield';

    const searchSourceMock = createSearchSourceMock({ index });
    const result = await getSharingData(
      searchSourceMock,
      {
        columns: [
          'cool-field-1',
          'cool-field-2',
          'cool-field-3',
          'cool-field-4',
          'cool-field-5',
          'cool-field-6',
        ],
      },
      services
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "cool-field-1",
          "cool-field-2",
          "cool-field-3",
          "cool-field-4",
          "cool-field-5",
          "cool-field-6",
        ],
        "getSearchSource": [Function],
      }
    `);
  });
});

describe('showPublicUrlSwitch', () => {
  test('returns false if "discover" app is not available', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns false if "discover" app is not accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      discover: {
        show: false,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns true if "discover" app is not available an accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      discover: {
        show: true,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(true);
  });
});
