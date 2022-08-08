/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasUserDataView } from './has_user_data_view';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('hasUserDataView', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => jest.resetAllMocks());

  it('returns false when there are no data views', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 0,
      saved_objects: [],
    });
    expect(await hasUserDataView({ esClient, soClient })).toEqual(false);
  });

  it('returns true when there are data views', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 1,
      saved_objects: [
        {
          id: '1',
          references: [],
          type: 'index-pattern',
          score: 99,
          attributes: { title: 'my-pattern-*' },
        },
      ],
    });
    expect(await hasUserDataView({ esClient, soClient })).toEqual(true);
  });

  it('can shortcut using api internally', async () => {
    const dataViewsFindResponse = {
      page: 1,
      per_page: 100,
      total: 1,
      saved_objects: [
        {
          id: '1',
          references: [],
          type: 'index-pattern',
          score: 99,
          attributes: { title: 'my-pattern-*' },
        },
      ],
    };
    expect(await hasUserDataView({ esClient, soClient }, dataViewsFindResponse)).toEqual(true);
    expect(soClient.find).not.toBeCalled();
  });
});
