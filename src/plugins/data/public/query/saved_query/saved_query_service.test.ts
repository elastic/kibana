/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSavedQueryService } from './saved_query_service';
import { FilterStateStore } from '../../../common';
import { SavedQueryAttributes } from './types';

const savedQueryAttributes: SavedQueryAttributes = {
  title: 'foo',
  description: 'bar',
  query: {
    language: 'kuery',
    query: 'response:200',
  },
};
const savedQueryAttributesBar: SavedQueryAttributes = {
  title: 'bar',
  description: 'baz',
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

const {
  deleteSavedQuery,
  getSavedQuery,
  findSavedQueries,
  saveQuery,
  getAllSavedQueries,
  getSavedQueryCount,
} = createSavedQueryService(
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

  describe('saveQuery', function () {
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
  describe('findSavedQueries', function () {
    it('should find and return saved queries without search text or pagination parameters', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
        total: 5,
      });

      const response = await findSavedQueries();
      expect(response.queries).toEqual([{ id: 'foo', attributes: savedQueryAttributes }]);
    });

    it('should return the total count along with the requested queries', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
        total: 5,
      });

      const response = await findSavedQueries();
      expect(response.total).toEqual(5);
    });

    it('should find and return saved queries with search text matching the title field', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
        total: 5,
      });
      const response = await findSavedQueries('foo');
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        page: 1,
        perPage: 50,
        search: 'foo',
        searchFields: ['title^5', 'description'],
        sortField: '_score',
        type: 'query',
      });
      expect(response.queries).toEqual([{ id: 'foo', attributes: savedQueryAttributes }]);
    });
    it('should find and return parsed filters and timefilters items', async () => {
      const serializedSavedQueryAttributesWithFilters = {
        ...savedQueryAttributesWithFilters,
        filters: savedQueryAttributesWithFilters.filters,
        timefilter: savedQueryAttributesWithFilters.timefilter,
      };
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: serializedSavedQueryAttributesWithFilters }],
        total: 5,
      });
      const response = await findSavedQueries('bar');
      expect(response.queries).toEqual([
        { id: 'foo', attributes: savedQueryAttributesWithFilters },
      ]);
    });
    it('should return an array of saved queries', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
        total: 5,
      });
      const response = await findSavedQueries();
      expect(response.queries).toEqual(
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
    it('should accept perPage and page properties', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [
          { id: 'foo', attributes: savedQueryAttributes },
          { id: 'bar', attributes: savedQueryAttributesBar },
        ],
        total: 5,
      });
      const response = await findSavedQueries(undefined, 2, 1);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        page: 1,
        perPage: 2,
        search: '',
        searchFields: ['title^5', 'description'],
        sortField: '_score',
        type: 'query',
      });
      expect(response.queries).toEqual(
        expect.objectContaining([
          {
            attributes: {
              description: 'bar',
              query: { language: 'kuery', query: 'response:200' },
              title: 'foo',
            },
            id: 'foo',
          },
          {
            attributes: {
              description: 'baz',
              query: { language: 'kuery', query: 'response:200' },
              title: 'bar',
            },
            id: 'bar',
          },
        ])
      );
    });
  });

  describe('getSavedQuery', function () {
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

    it('should parse a json query', async () => {
      mockSavedObjectsClient.get.mockReturnValue({
        id: 'food',
        attributes: {
          title: 'food',
          description: 'bar',
          query: {
            language: 'kuery',
            query: '{"x": "y"}',
          },
        },
      });

      const response = await getSavedQuery('food');
      expect(response.attributes.query.query).toEqual({ x: 'y' });
    });

    it('should handle null string', async () => {
      mockSavedObjectsClient.get.mockReturnValue({
        id: 'food',
        attributes: {
          title: 'food',
          description: 'bar',
          query: {
            language: 'kuery',
            query: 'null',
          },
        },
      });

      const response = await getSavedQuery('food');
      expect(response.attributes.query.query).toEqual('null');
    });

    it('should handle null quoted string', async () => {
      mockSavedObjectsClient.get.mockReturnValue({
        id: 'food',
        attributes: {
          title: 'food',
          description: 'bar',
          query: {
            language: 'kuery',
            query: '"null"',
          },
        },
      });

      const response = await getSavedQuery('food');
      expect(response.attributes.query.query).toEqual('"null"');
    });

    it('should not lose quotes', async () => {
      mockSavedObjectsClient.get.mockReturnValue({
        id: 'food',
        attributes: {
          title: 'food',
          description: 'bar',
          query: {
            language: 'kuery',
            query: '"Bob"',
          },
        },
      });

      const response = await getSavedQuery('food');
      expect(response.attributes.query.query).toEqual('"Bob"');
    });
  });

  describe('deleteSavedQuery', function () {
    it('should delete the saved query for the given ID', async () => {
      await deleteSavedQuery('foo');
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith('query', 'foo');
    });
  });

  describe('getAllSavedQueries', function () {
    it('should return all the saved queries', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        savedObjects: [{ id: 'foo', attributes: savedQueryAttributes }],
      });
      const response = await getAllSavedQueries();
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
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        page: 1,
        perPage: 0,
        type: 'query',
      });
    });
  });

  describe('getSavedQueryCount', function () {
    it('should return the total number of saved queries', async () => {
      mockSavedObjectsClient.find.mockReturnValue({
        total: 1,
      });
      const response = await getSavedQueryCount();
      expect(response).toEqual(1);
    });
  });
});
