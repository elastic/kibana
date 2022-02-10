/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { times } from 'lodash';
import { SavedObjectsFindOptions, SavedObjectsFindResult } from 'src/core/server';
import { savedObjectsClientMock } from '../../../../core/server/mocks';
import { findAll } from './find_all';

describe('findAll', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const createObj = (id: number): SavedObjectsFindResult => ({
    type: 'type',
    id: `id-${id}`,
    attributes: {},
    score: 1,
    references: [],
  });

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('calls `client.createPointInTimeFinder` with the correct parameters', async () => {
    const query: SavedObjectsFindOptions = {
      type: ['some-type', 'another-type'],
    };

    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 1,
      per_page: 20,
      page: 1,
    });

    await findAll(savedObjectsClient, query);

    expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(query);
  });

  it('returns the results from the PIT search', async () => {
    const query: SavedObjectsFindOptions = {
      type: ['some-type', 'another-type'],
    };

    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [createObj(1), createObj(2)],
      total: 1,
      per_page: 20,
      page: 1,
    });

    const results = await findAll(savedObjectsClient, query);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        ...query,
      })
    );

    expect(results).toEqual([createObj(1), createObj(2)]);
  });

  it('works when the PIT search returns multiple batches', async () => {
    const query: SavedObjectsFindOptions = {
      type: ['some-type', 'another-type'],
      perPage: 2,
    };
    const objPerPage = 2;

    let callCount = 0;
    savedObjectsClient.find.mockImplementation(({}) => {
      callCount++;
      const firstInPage = (callCount - 1) * objPerPage + 1;
      return Promise.resolve({
        saved_objects:
          callCount > 3
            ? [createObj(firstInPage)]
            : [createObj(firstInPage), createObj(firstInPage + 1)],
        total: objPerPage * 3,
        per_page: objPerPage,
        page: callCount!,
      });
    });

    const results = await findAll(savedObjectsClient, query);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(4);
    expect(results).toEqual(times(7, (num) => createObj(num + 1)));
  });
});
