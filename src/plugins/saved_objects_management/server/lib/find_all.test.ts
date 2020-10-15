/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
