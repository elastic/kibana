/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSavedQueryService } from './saved_query_service';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SavedQueryAttributes } from '../../../common';

const http = httpServiceMock.createStartContract();

const {
  deleteSavedQuery,
  getSavedQuery,
  findSavedQueries,
  createQuery,
  updateQuery,
  getAllSavedQueries,
  getSavedQueryCount,
} = createSavedQueryService(http);

const savedQueryAttributes: SavedQueryAttributes = {
  title: 'foo',
  description: 'bar',
  query: {
    language: 'kuery',
    query: 'response:200',
  },
  filters: [],
};

describe('saved query service', () => {
  afterEach(() => {
    http.post.mockReset();
    http.get.mockReset();
    http.delete.mockReset();
  });

  describe('createQuery', function () {
    it('should post the stringified given attributes', async () => {
      await createQuery(savedQueryAttributes);
      expect(http.post).toBeCalled();
      expect(http.post).toHaveBeenCalledWith('/api/saved_query/_create', {
        body: '{"title":"foo","description":"bar","query":{"language":"kuery","query":"response:200"},"filters":[]}',
      });
    });
  });

  describe('updateQuery', function () {
    it('should put the ID & stringified given attributes', async () => {
      await updateQuery('foo', savedQueryAttributes);
      expect(http.put).toBeCalled();
      expect(http.put).toHaveBeenCalledWith('/api/saved_query/foo', {
        body: '{"title":"foo","description":"bar","query":{"language":"kuery","query":"response:200"},"filters":[]}',
      });
    });
  });

  describe('getAllSavedQueries', function () {
    it('should post and extract the saved queries from the response', async () => {
      http.post.mockResolvedValue({
        total: 0,
        savedQueries: [{ attributes: savedQueryAttributes }],
      });
      const result = await getAllSavedQueries();
      expect(http.post).toBeCalled();
      expect(http.post).toHaveBeenCalledWith('/api/saved_query/_all');
      expect(result).toEqual([{ attributes: savedQueryAttributes }]);
    });
  });

  describe('findSavedQueries', function () {
    it('should post and return the total & saved queries', async () => {
      http.post.mockResolvedValue({
        total: 0,
        savedQueries: [{ attributes: savedQueryAttributes }],
      });
      const result = await findSavedQueries();
      expect(http.post).toBeCalled();
      expect(http.post).toHaveBeenCalledWith('/api/saved_query/_find', {
        body: '{"page":1,"perPage":50,"search":""}',
      });
      expect(result).toEqual({
        queries: [{ attributes: savedQueryAttributes }],
        total: 0,
      });
    });
  });

  describe('getSavedQuery', function () {
    it('should get the given ID', async () => {
      await getSavedQuery('my_id');
      expect(http.get).toBeCalled();
      expect(http.get).toHaveBeenCalledWith('/api/saved_query/my_id');
    });
  });

  describe('deleteSavedQuery', function () {
    it('should delete the given ID', async () => {
      await deleteSavedQuery('my_id');
      expect(http.delete).toBeCalled();
      expect(http.delete).toHaveBeenCalledWith('/api/saved_query/my_id');
    });
  });

  describe('getSavedQueryCount', function () {
    it('should get the total', async () => {
      await getSavedQueryCount();
      expect(http.get).toBeCalled();
      expect(http.get).toHaveBeenCalledWith('/api/saved_query/_count');
    });
  });
});
