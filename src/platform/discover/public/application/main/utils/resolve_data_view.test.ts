/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadDataView } from './resolve_data_view';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock as services } from '../../../__mocks__/services';

describe('Resolve data view tests', () => {
  test('returns valid data for an existing data view', async () => {
    const id = 'the-data-view-id';
    const result = await loadDataView({
      id,
      services,
      dataViewList: [],
    });
    expect(result.loaded).toEqual(dataViewMock);
    expect(result.stateVal).toEqual(id);
    expect(result.stateValFound).toEqual(true);
  });
  test('returns fallback data for an invalid data view', async () => {
    const id = 'invalid-id';
    const result = await loadDataView({
      id,
      services,
      dataViewList: [],
    });
    expect(result.loaded).toEqual(dataViewMock);
    expect(result.stateValFound).toBe(false);
    expect(result.stateVal).toBe(id);
  });
});
