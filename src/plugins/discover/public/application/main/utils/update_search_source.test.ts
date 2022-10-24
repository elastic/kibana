/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { updateSearchSource, updateVolatileSearchSource } from './update_search_source';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataViewMock } from '../../../__mocks__/data_view';
import { discoverServiceMock } from '../../../__mocks__/services';

describe('updateSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSource = createSearchSourceMock({});
    updateSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
    });
    expect(searchSource.getField('index')).toEqual(dataViewMock);
    expect(searchSource.getField('fields')).toBe(undefined);
  });

  test('updates a given search source with the usage of the new fields api', async () => {
    const searchSource = createSearchSourceMock({});
    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
    });
    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: 'true' }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });

  test('updates a given search source when showUnmappedFields option is set to true', async () => {
    const searchSource = createSearchSourceMock({});
    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
    });
    expect(searchSource.getField('fields')).toEqual([{ field: '*', include_unmapped: 'true' }]);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });

  test('does not explicitly request fieldsFromSource when not using fields API', async () => {
    const searchSource = createSearchSourceMock({});
    updateVolatileSearchSource(searchSource, {
      dataView: dataViewMock,
      services: discoverServiceMock,
    });
    expect(searchSource.getField('fields')).toEqual(undefined);
    expect(searchSource.getField('fieldsFromSource')).toBe(undefined);
  });
});
