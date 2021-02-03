/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { updateSearchSource } from './update_search_source';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { IUiSettingsClient } from 'kibana/public';
import { DiscoverServices } from '../../build_services';
import { dataPluginMock } from '../../../../data/public/mocks';
import { SAMPLE_SIZE_SETTING } from '../../../common';
import { SortOrder } from '../../saved_searches/types';

describe('updateSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSourceMock = createSearchSourceMock({});
    const sampleSize = 250;
    const result = updateSearchSource(searchSourceMock, {
      indexPattern: indexPatternMock,
      services: ({
        data: dataPluginMock.createStartContract(),
        uiSettings: ({
          get: (key: string) => {
            if (key === SAMPLE_SIZE_SETTING) {
              return sampleSize;
            }
            return false;
          },
        } as unknown) as IUiSettingsClient,
      } as unknown) as DiscoverServices,
      sort: [] as SortOrder[],
      columns: [],
      useNewFieldsApi: false,
    });
    expect(result.getField('index')).toEqual(indexPatternMock);
    expect(result.getField('size')).toEqual(sampleSize);
    expect(result.getField('fields')).toBe(undefined);
  });

  test('updates a given search source with the usage of the new fields api', async () => {
    const searchSourceMock = createSearchSourceMock({});
    const sampleSize = 250;
    const result = updateSearchSource(searchSourceMock, {
      indexPattern: indexPatternMock,
      services: ({
        data: dataPluginMock.createStartContract(),
        uiSettings: ({
          get: (key: string) => {
            if (key === SAMPLE_SIZE_SETTING) {
              return sampleSize;
            }
            return false;
          },
        } as unknown) as IUiSettingsClient,
      } as unknown) as DiscoverServices,
      sort: [] as SortOrder[],
      columns: [],
      useNewFieldsApi: true,
    });
    expect(result.getField('index')).toEqual(indexPatternMock);
    expect(result.getField('size')).toEqual(sampleSize);
    expect(result.getField('fields')).toEqual(['*']);
    expect(result.getField('fieldsFromSource')).toBe(undefined);
  });
});
