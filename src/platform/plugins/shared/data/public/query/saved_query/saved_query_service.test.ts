/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSavedQueryService } from './saved_query_service';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SavedQueryAttributes } from '../../../common';
import { SAVED_QUERY_BASE_URL } from '../../../common/constants';

const http = httpServiceMock.createStartContract();

const {
  isDuplicateTitle,
  deleteSavedQuery,
  getSavedQuery,
  findSavedQueries,
  createQuery,
  updateQuery,
  getSavedQueryCount,
} = createSavedQueryService(http);

const version = '1';

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

  describe('isDuplicateTitle', function () {
    it('should post the title and ID', async () => {
      http.post.mockResolvedValue({ isDuplicate: true });
      await isDuplicateTitle('foo', 'bar');
      expect(http.post).toBeCalled();
      expect(http.post).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`, {
        body: '{"title":"foo","id":"bar"}',
        version,
      });
    });
  });

  describe('createQuery', function () {
    it('should post the stringified given attributes', async () => {
      await createQuery(savedQueryAttributes);
      expect(http.post).toBeCalled();
      expect(http.post).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/_create`, {
        body: '{"title":"foo","description":"bar","query":{"language":"kuery","query":"response:200"},"filters":[]}',
        version,
      });
    });
  });

  describe('updateQuery', function () {
    it('should put the ID & stringified given attributes', async () => {
      await updateQuery('foo', savedQueryAttributes);
      expect(http.put).toBeCalled();
      expect(http.put).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/foo`, {
        body: '{"title":"foo","description":"bar","query":{"language":"kuery","query":"response:200"},"filters":[]}',
        version,
      });
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
      expect(http.post).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/_find`, {
        body: '{"page":1,"perPage":50,"search":""}',
        version,
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
      expect(http.get).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/my_id`, { version });
    });
  });

  describe('deleteSavedQuery', function () {
    it('should delete the given ID', async () => {
      await deleteSavedQuery('my_id');
      expect(http.delete).toBeCalled();
      expect(http.delete).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/my_id`, { version });
    });
  });

  describe('getSavedQueryCount', function () {
    it('should get the total', async () => {
      await getSavedQueryCount();
      expect(http.get).toBeCalled();
      expect(http.get).toHaveBeenCalledWith(`${SAVED_QUERY_BASE_URL}/_count`, { version });
    });
  });
});
