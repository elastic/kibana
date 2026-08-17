/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  it('returns true when there is an unmanaged data view', async () => {
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

  it('returns false when there are only managed data views', async () => {
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
          managed: true,
          attributes: { title: 'managed-pattern-*' },
        },
      ],
    });

    expect(await hasUserDataView({ esClient, soClient })).toEqual(false);
  });

  it('returns true when there is at least one unmanaged data view', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 2,
      saved_objects: [
        {
          id: '1',
          references: [],
          type: 'index-pattern',
          score: 99,
          managed: true,
          attributes: { title: 'managed-pattern-*' },
        },
        {
          id: '2',
          references: [],
          type: 'index-pattern',
          score: 99,
          managed: false,
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
