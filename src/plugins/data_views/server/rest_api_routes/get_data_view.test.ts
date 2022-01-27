/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDataView } from './get_data_view';
import { dataViewsService } from '../mocks';
import { getUsageCollection } from './test_utils';

describe('get default data view', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();
    getDataView({
      dataViewsService,
      counterName: 'GET /path',
      usageCollection,
      id: '1',
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
