/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setDefault, getDefault } from './default_data_view';
import { dataViewsService } from '../mocks';
import { getUsageCollection } from './test_utils';

describe('default data view', () => {
  it('set - calls usageCollection', () => {
    const usageCollection = getUsageCollection();
    setDefault({
      dataViewsService,
      counterName: 'POST /path',
      usageCollection,
      newDefaultId: '1',
      force: false,
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });

  it('get - calls usageCollection', () => {
    const usageCollection = getUsageCollection();
    getDefault({
      dataViewsService,
      counterName: 'GET /path',
      usageCollection,
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
