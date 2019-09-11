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

import { SavedQueryAttributes } from '../index';
import { createSavedQueryService } from './saved_query_service';
import { FilterStateStore } from '@kbn/es-query';

const savedQueryAttributes: SavedQueryAttributes = {
  title: 'foo',
  description: 'bar',
  query: {
    language: 'kuery',
    query: 'response:200',
  },
};

const savedQueryAttributesWithFilters: SavedQueryAttributes = {
  ...savedQueryAttributes,
  filters: [
    {
      query: { match_all: {} },
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        disabled: false,
        negate: false,
        alias: null,
      },
    },
  ],
  timefilter: {
    to: 'now',
    from: 'now-15m',
    refreshInterval: {
      pause: false,
      value: 0,
    },
  },
};

const mockSavedObjectsClient = {
  create: jest.fn(),
  error: jest.fn(),
  find: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

const { deleteSavedQuery, getSavedQuery, findSavedQueries, saveQuery } = createSavedQueryService(
  // @ts-ignore
  mockSavedObjectsClient
);

describe('saved query service', () => {
  afterEach(() => {
    mockSavedObjectsClient.create.mockReset();
    mockSavedObjectsClient.find.mockReset();
    mockSavedObjectsClient.get.mockReset();
    mockSavedObjectsClient.delete.mockReset();
  });

  describe('saveQuery', function() {
    it('should create a saved object for the given attributes', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        id: 'foo',
        attributes: savedQueryAttributes,
      });

      const response = await saveQuery(savedQueryAttributes);
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith('query', savedQueryAttributes, {
        id: 'foo',
      });
      expect(response).toEqual({ id: 'foo', attributes: savedQueryAttributes });
    });

    it('should allow overwriting an existing saved query', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        id: 'foo',
        attributes: savedQueryAttributes,
      });

      const response = await saveQuery(savedQueryAttributes, { overwrite: true });
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith('query', savedQueryAttributes, {
        id: 'foo',
        overwrite: true,
      });
      expect(response).toEqual({ id: 'foo', attributes: savedQueryAttributes });
    });

    it('should optionally accept filters and timefilters in object format', async () => {
      const serializedSavedQueryAttributesWithFilters = {
        ...savedQueryAttributesWithFilters,
        filters: savedQueryAttributesWithFilters.filters,
        timefilter: savedQueryAttributesWithFilters.timefilter,
      };

      mockSavedObjectsClient.create.mockReturnValue({
        id: 'foo',
        attributes: serializedSavedQueryAttributesWithFilters,
      });

      const response = await saveQuery(savedQueryAttributesWithFilters);

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        'query',
        serializedSavedQueryAttributesWithFilters,
        { id: 'foo' }
      );
      expect(response).toEqual({ id: 'foo', attributes: savedQueryAttributesWithFilters });
    });

    it('should throw an error when saved objects client returns error', async () => {
      mockSavedObjectsClient.create.mockReturnValue({
        error: {
          error: '123',
          message: 'An Error',
        },
      });

      let error = null;
      try {
        await saveQuery(savedQueryAttributes);
      } catch (e) {
        error = e;
      }
      expect(error).not.toBe(null);
    });
    it('should throw an error if the saved query does not have a title', async () => {
      let error = null;
      try {
        await saveQuery({ ...savedQueryAttributes, title: '' });
      } catch (e) {
        error = e;
      }
      expect(error).not.toBe(null);
    });
  });
  describe('findSavedQueries', function() {
    it('should find and return saved queries without search text', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
      });

      const response = await findSavedQueries();
      expect(response).toEqual([{ id: 'foo', attributes: savedQueryAttributes }]);
    });

    it('should find and return saved queries with search text matching the title field', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
      });
      const response = await findSavedQueries('foo');
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        search: 'foo',
        searchFields: ['title^5', 'description'],
        sortField: '_score',
        type: 'query',
      });
      expect(response).toEqual([{ id: 'foo', attributes: savedQueryAttributes }]);
    });
    it('should find and return parsed filters and timefilters items', async () => {
      const serializedSavedQueryAttributesWithFilters = {
        ...savedQueryAttributesWithFilters,
        filters: savedQueryAttributesWithFilters.filters,
        timefilter: savedQueryAttributesWithFilters.timefilter,
      };
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: serializedSavedQueryAttributesWithFilters }],
      });
      const response = await findSavedQueries('bar');
      expect(response).toEqual([{ id: 'foo', attributes: savedQueryAttributesWithFilters }]);
    });
    it('should return an array of saved queries', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
      });
      const response = await findSavedQueries();
      expect(response).toEqual(
        expect.objectContaining([
          {
            attributes: {
              description: 'bar',
              query: { language: 'kuery', query: 'response:200' },
              title: 'foo',
            },
            id: 'foo',
          },
        ])
      );
    });
  });

  describe('getSavedQuery', function() {
    it('should retrieve a saved query by id', async () => {
      mockSavedObjectsClient.get.mockReturnValue({ id: 'foo', attributes: savedQueryAttributes });

      const response = await getSavedQuery('foo');
      expect(response).toEqual({ id: 'foo', attributes: savedQueryAttributes });
    });
    it('should only return saved queries', async () => {
      mockSavedObjectsClient.get.mockReturnValue({ id: 'foo', attributes: savedQueryAttributes });

      await getSavedQuery('foo');
      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith('query', 'foo');
    });
  });

  describe('deleteSavedQuery', function() {
    it('should delete the saved query for the given ID', async () => {
      await deleteSavedQuery('foo');
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith('query', 'foo');
    });
  });
});
