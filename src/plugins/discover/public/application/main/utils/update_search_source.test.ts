/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { updateVolatileSearchSource } from './update_search_source';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

const getUiSettingsMock = (value: boolean) => {
  return {
    get: jest.fn(() => value),
  } as unknown as IUiSettingsClient;
};

describe('updateVolatileSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSource = createSearchSourceMock({});
    discoverServiceMock.uiSettings = getUiSettingsMock(true);
    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
    });
    expect(searchSource.getField('fields')).toBe(undefined);
  });

  test('updates a given search source with the usage of the new fields api', async () => {
    const searchSource = createSearchSourceMock({});
    discoverServiceMock.uiSettings = getUiSettingsMock(false);
    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
    });
    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: 'true' }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });

  test('updates a given search source when showUnmappedFields option is set to true', async () => {
    const volatileSearchSourceMock = createSearchSourceMock({});
    discoverServiceMock.uiSettings = getUiSettingsMock(false);
    updateVolatileSearchSource(volatileSearchSourceMock, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
    });
    expect(volatileSearchSourceMock.getField('fields')).toEqual([
      { field: '*', include_unmapped: 'true' },
    ]);
    expect(volatileSearchSourceMock.getField('fieldsFromSource')).toBe(undefined);
  });

  test('does not explicitly request fieldsFromSource when not using fields API', async () => {
    const volatileSearchSourceMock = createSearchSourceMock({});
    discoverServiceMock.uiSettings = getUiSettingsMock(true);
    updateVolatileSearchSource(volatileSearchSourceMock, {
      dataView: dataViewMock,
      services: discoverServiceMock,
      sort: [] as SortOrder[],
    });
    expect(volatileSearchSourceMock.getField('fields')).toEqual(undefined);
    expect(volatileSearchSourceMock.getField('fieldsFromSource')).toBe(undefined);
  });
});
