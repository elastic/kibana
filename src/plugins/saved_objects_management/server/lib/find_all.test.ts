/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

  it('calls the saved object client with the correct parameters', async () => {
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
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...query,
      page: 1,
    });

    expect(results).toEqual([createObj(1), createObj(2)]);
  });

  it('recursively call find until all objects are fetched', async () => {
    const query: SavedObjectsFindOptions = {
      type: ['some-type', 'another-type'],
    };
    const objPerPage = 2;

    savedObjectsClient.find.mockImplementation(({ page }) => {
      const firstInPage = (page! - 1) * objPerPage + 1;
      return Promise.resolve({
        saved_objects: [createObj(firstInPage), createObj(firstInPage + 1)],
        total: objPerPage * 3,
        per_page: objPerPage,
        page: page!,
      });
    });

    const results = await findAll(savedObjectsClient, query);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...query,
      page: 1,
    });
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...query,
      page: 2,
    });
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...query,
      page: 3,
    });

    expect(results).toEqual(times(6, (num) => createObj(num + 1)));
  });
});
