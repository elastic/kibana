/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import type { RangeFilter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DiscoverServices } from '../build_services';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { getColumnsWithTimeField, getSharingData, showPublicUrlSwitch } from './get_sharing_data';

describe('getSharingData', () => {
  let services: DiscoverServices;

  beforeEach(() => {
    const discoverServiceMock = createDiscoverServicesMock();
    services = {
      ...discoverServiceMock,
      uiSettings: {
        get: (key: string) => {
          if (key === SORT_DEFAULT_ORDER_SETTING) {
            return 'desc';
          }
          if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
            return false;
          }
          return false;
        },
      } as IUiSettingsClient,
    };
  });

  test('returns valid data for sharing', async () => {
    const searchSourceMock = createSearchSourceMock({ index: dataViewMock });
    const result = await getSharingData(searchSourceMock, { columns: [] }, services);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [],
        "getSearchSource": [Function],
      }
    `);
  });

  test('returns valid data for sharing when columns are selected', async () => {
    const searchSourceMock = createSearchSourceMock({ index: dataViewMock });
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
    const index = { ...dataViewMock } as DataView;
    index.timeFieldName = 'cool-timefield';
    const searchSourceMock = createSearchSourceMock({ index });
    const { getSearchSource } = await getSharingData(searchSourceMock, {}, services);
    expect(getSearchSource({})).toMatchInlineSnapshot(`
      Object {
        "fields": Array [
          Object {
            "field": "*",
            "include_unmapped": true,
          },
        ],
        "index": "the-data-view-id",
        "sort": Array [
          Object {
            "_doc": "desc",
          },
        ],
      }
    `);
  });

  test('getSearchSource does add fields to the searchSource when columns are selected', async () => {
    const index = { ...dataViewMock } as DataView;
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
    expect(getSearchSource({}).fields).toStrictEqual([
      { field: 'cool-timefield', include_unmapped: true },
      { field: 'cool-field-1', include_unmapped: true },
      { field: 'cool-field-2', include_unmapped: true },
      { field: 'cool-field-3', include_unmapped: true },
      { field: 'cool-field-4', include_unmapped: true },
      { field: 'cool-field-5', include_unmapped: true },
      { field: 'cool-field-6', include_unmapped: true },
    ]);
  });

  test('getSearchSource supports nested fields', async () => {
    const index = buildDataViewMock({
      name: 'the-data-view',
      timeFieldName: 'cool-timefield',
      fields: [
        ...dataViewMock.fields,
        {
          name: 'cool-field-2.field',
          type: 'keyword',
          subType: {
            nested: {
              path: 'cool-field-2.field.path',
            },
          },
        },
      ] as DataView['fields'],
    });
    const searchSourceMock = createSearchSourceMock({ index });
    const { getSearchSource } = await getSharingData(
      searchSourceMock,
      {
        columns: ['cool-field-1', 'cool-field-2'],
      },
      services
    );
    expect(getSearchSource({}).fields).toStrictEqual([
      { field: 'cool-timefield', include_unmapped: true },
      { field: 'cool-field-1', include_unmapped: true },
      { field: 'cool-field-2.*', include_unmapped: true },
    ]);
  });

  test('fields have prepended timeField', async () => {
    const index = { ...dataViewMock } as DataView;
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

  test('fields do not have prepended timeField for transformational ES|QL', async () => {
    const index = { ...dataViewMock } as DataView;
    index.timeFieldName = 'cool-timefield';

    const searchSourceMock = createSearchSourceMock({ index });
    searchSourceMock.setField('query', {
      esql: 'from logstash-* | keep cool-field-1, cool-field-2, cool-field-3, cool-field-4, cool-field-5, cool-field-6',
    });
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

  test('fields have prepended timeField for non-transformational ES|QL', async () => {
    const index = { ...dataViewMock } as DataView;
    index.timeFieldName = 'cool-timefield';

    const searchSourceMock = createSearchSourceMock({ index });
    searchSourceMock.setField('query', { esql: 'from logstash-* | where bytes > 0' });
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

  test('getSearchSource does not throw when there is no data view (ES|QL dashboard panel)', async () => {
    // ES|QL saved-search panels on a dashboard can have no resolved data view on the search
    // source, so `getField('index')` is undefined. getSearchSource must not throw when mapping
    // columns to fields (nested field roots do not apply in ES|QL mode).
    const searchSourceMock = createSearchSourceMock({});
    searchSourceMock.setField('query', {
      esql: 'from logstash-* | keep cool-field-1, cool-field-2',
    });
    const { getSearchSource } = await getSharingData(
      searchSourceMock,
      { columns: ['cool-field-1', 'cool-field-2'] },
      services
    );
    expect(getSearchSource({}).fields).toStrictEqual([
      { field: 'cool-field-1', include_unmapped: true },
      { field: 'cool-field-2', include_unmapped: true },
    ]);
  });

  test('fields conditionally do not have prepended timeField', async () => {
    services.uiSettings = {
      get: (key: string) => {
        return key === DOC_HIDE_TIME_COLUMN_SETTING;
      },
    } as unknown as IUiSettingsClient;

    const index = { ...dataViewMock } as DataView;
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

  test('getSearchSource works correctly', async () => {
    const searchSourceMock = createSearchSourceMock({ index: dataViewMock });
    const appFilter = {
      $state: {
        store: FilterStateStore.APP_STATE,
      },
      meta: {
        alias: null,
        disabled: false,
        index: dataViewMock.id,
        key: 'extension.keyword',
        negate: false,
        params: {
          query: 'zip',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'extension.keyword': 'zip',
        },
      },
    };
    const absoluteTimeFilter = {
      meta: {
        index: dataViewMock.id,
        params: {},
        field: 'timestamp',
        type: 'range',
      },
      query: {
        range: {
          timestamp: {
            format: 'strict_date_optional_time',
            gte: '2024-04-18T12:07:56.713Z',
            lte: '2024-04-18T12:22:56.713Z',
          },
        },
      },
    } as RangeFilter;
    const relativeTimeFilter = {
      meta: {
        index: dataViewMock.id,
        params: {},
        field: 'timestamp',
        type: 'range',
      },
      query: {
        range: {
          timestamp: {
            format: 'strict_date_optional_time',
            gte: 'now-15m',
            lte: 'now',
          },
        },
      },
    } as RangeFilter;
    searchSourceMock.setField('filter', [appFilter]);
    const servicesMock = createDiscoverServicesMock();
    servicesMock.data.query.timefilter.timefilter.createFilter = jest.fn(() => absoluteTimeFilter);
    servicesMock.data.query.timefilter.timefilter.createRelativeFilter = jest.fn(
      () => relativeTimeFilter
    );

    // with app filters as an array
    const result = await getSharingData(
      searchSourceMock,
      {
        columns: ['cool-field-1'],
      },
      servicesMock
    );
    expect(
      result.getSearchSource({ addGlobalTimeFilter: true, absoluteTime: false }).filter
    ).toEqual([relativeTimeFilter, appFilter]);
    expect(
      result.getSearchSource({ addGlobalTimeFilter: true, absoluteTime: true }).filter
    ).toEqual([absoluteTimeFilter, appFilter]);
    expect(
      result.getSearchSource({ addGlobalTimeFilter: false, absoluteTime: false }).filter
    ).toEqual([appFilter]);
    expect(
      result.getSearchSource({ addGlobalTimeFilter: false, absoluteTime: true }).filter
    ).toEqual([appFilter]);

    // with app filter as a single filter and the same as the absolute time filter
    searchSourceMock.setField('filter', absoluteTimeFilter);
    const result2 = await getSharingData(
      searchSourceMock,
      {
        columns: ['cool-field-1'],
      },
      servicesMock
    );
    expect(
      result2.getSearchSource({ addGlobalTimeFilter: true, absoluteTime: true }).filter
    ).toEqual([absoluteTimeFilter]);
  });
});

describe('showPublicUrlSwitch', () => {
  test('returns false if "discover_v2" app is not available', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns false if "discover_v2" app is not accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      discover_v2: {
        show: false,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns true if "discover_v2" app is not available an accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      discover_v2: {
        show: true,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(true);
  });
});

describe('getColumnsWithTimeField', () => {
  const createUiSettingsMock = ({ hideTimeColumn }: { hideTimeColumn: boolean }) =>
    ({
      get: (key: string) => {
        if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
          return hideTimeColumn;
        }
        return undefined;
      },
    } as unknown as IUiSettingsClient);

  const uiSettingsMockWithHideTimeColumn = createUiSettingsMock({ hideTimeColumn: true });
  const uiSettingsMock = createUiSettingsMock({ hideTimeColumn: false });

  it('should prepend the time field for a non-transformational ES|QL query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['@timestamp', 'bytes', 'extension']);
  });

  it('should not prepend when columns are empty', () => {
    expect(
      getColumnsWithTimeField({
        columns: [],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual([]);
  });

  it('should not prepend for a transformational ES|QL query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-* | keep bytes, extension' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should not prepend when timeFieldName is undefined', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: undefined,
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should not prepend when time field already in columns', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['@timestamp', 'bytes'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['@timestamp', 'bytes']);
  });

  it('should not prepend when hideTimeColumn setting is true', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMockWithHideTimeColumn,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should prepend the time field for a classic KQL query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { language: 'kuery', query: '*' },
      })
    ).toEqual(['@timestamp', 'bytes', 'extension']);
  });

  it('should prepend the time field for a classic Lucene query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { language: 'lucene', query: '*' },
      })
    ).toEqual(['@timestamp', 'bytes', 'extension']);
  });

  it('should not prepend for a classic query when hideTimeColumn setting is true', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMockWithHideTimeColumn,
        query: { language: 'kuery', query: '*' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should not prepend for a classic query when time field already in columns', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['@timestamp', 'bytes'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { language: 'kuery', query: '*' },
      })
    ).toEqual(['@timestamp', 'bytes']);
  });

  it('should not prepend for a classic query when columns are empty', () => {
    expect(
      getColumnsWithTimeField({
        columns: [],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { language: 'kuery', query: '*' },
      })
    ).toEqual([]);
  });

  it('should prepend the time field when query is undefined', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: undefined,
      })
    ).toEqual(['@timestamp', 'bytes', 'extension']);
  });

  it('should not prepend when query is undefined and hideTimeColumn setting is true', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMockWithHideTimeColumn,
        query: undefined,
      })
    ).toEqual(['bytes', 'extension']);
  });
});
