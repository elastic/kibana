/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDataView } from './create_data_view';
import { dataViewsService } from '../../mocks';
import { getUsageCollection } from './test_utils';

describe('create data view', () => {
  it('call usageCollection', async () => {
    const usageCollection = getUsageCollection();
    await createDataView({
      dataViewsService,
      spec: {},
      counterName: 'POST /path',
      usageCollection,
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
