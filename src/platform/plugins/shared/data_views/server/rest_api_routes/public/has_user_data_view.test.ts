/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { hasUserDataView } from './has_user_data_view';
import { getUsageCollection } from './test_utils';

describe('has user data view', () => {
  it('call usageCollection', async () => {
    const usageCollection = getUsageCollection();
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ total: 0, saved_objects: [], per_page: 100, page: 1 });
    await hasUserDataView({
      soClient,
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      counterName: 'GET /path',
      usageCollection,
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
