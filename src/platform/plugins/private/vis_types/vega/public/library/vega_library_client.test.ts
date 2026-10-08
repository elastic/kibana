/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import {
  createVegaLibraryClient,
  getVegaVisualizationClient,
  hasVegaLibraryItemWithTitle,
} from './vega_library_client';

const meta = { created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' };
const item = {
  title: 'My chart',
  description: 'A chart',
  spec: { format: 'hjson' as const, value: '{ mark: bar }' },
  tags: ['tag-1'],
};

describe('vega library client', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVegaLibraryClient', () => {
    it('creates an item', async () => {
      http.post.mockResolvedValue({ id: 'new', data: item, meta });

      await createVegaLibraryClient(http).create(item);

      expect(http.post).toHaveBeenCalledWith('/api/vega', {
        version: '2023-10-31',
        body: JSON.stringify(item),
      });
    });

    it('gets an item by its encoded id', async () => {
      http.get.mockResolvedValue({ id: 'a/b', data: item, meta });

      await createVegaLibraryClient(http).get('a/b');

      expect(http.get).toHaveBeenCalledWith('/api/vega/a%2Fb', { version: '2023-10-31' });
    });

    it('throws a not found error when the item does not exist', async () => {
      http.get.mockRejectedValue({ response: { status: 404 }, message: 'Not Found' });

      await expect(createVegaLibraryClient(http).get('missing')).rejects.toBeInstanceOf(
        SavedObjectNotFound
      );
    });

    it('surfaces the server message for other errors', async () => {
      http.get.mockRejectedValue({ response: { status: 500 }, body: { message: 'boom' } });

      await expect(createVegaLibraryClient(http).get('id')).rejects.toThrow('boom');
    });

    it('replaces an item on update', async () => {
      http.put.mockResolvedValue({ id: 'id', data: item, meta });

      await createVegaLibraryClient(http).update('id', item);

      expect(http.put).toHaveBeenCalledWith('/api/vega/id', {
        version: '2023-10-31',
        body: JSON.stringify(item),
      });
    });

    it('deletes an item and reports success', async () => {
      http.delete.mockResolvedValue(undefined);

      await expect(createVegaLibraryClient(http).delete('id')).resolves.toEqual({
        success: true,
      });
      expect(http.delete).toHaveBeenCalledWith('/api/vega/id', { version: '2023-10-31' });
    });

    it('searches with the given query', async () => {
      http.get.mockResolvedValue({ data: [], meta: { page: 1, per_page: 20, total: 0 } });

      await createVegaLibraryClient(http).search({ query: 'chart' });

      expect(http.get).toHaveBeenCalledWith('/api/vega', {
        version: '2023-10-31',
        query: { query: 'chart' },
      });
    });
  });

  describe('hasVegaLibraryItemWithTitle', () => {
    it('matches an exact title ignoring case', async () => {
      http.get.mockResolvedValue({
        data: [{ id: '1', data: { title: 'my CHART' }, meta }],
        meta: { page: 1, per_page: 20, total: 1 },
      });

      await expect(
        hasVegaLibraryItemWithTitle(createVegaLibraryClient(http), 'My chart')
      ).resolves.toBe(true);
      expect(http.get).toHaveBeenCalledWith('/api/vega', {
        version: '2023-10-31',
        query: { query: '"My chart"' },
      });
    });

    it('ignores items whose title only partly matches', async () => {
      http.get.mockResolvedValue({
        data: [{ id: '1', data: { title: 'My chart 2' }, meta }],
        meta: { page: 1, per_page: 20, total: 1 },
      });

      await expect(
        hasVegaLibraryItemWithTitle(createVegaLibraryClient(http), 'My chart')
      ).resolves.toBe(false);
    });
  });

  describe('getVegaVisualizationClient', () => {
    it('exposes tags as saved object references', async () => {
      http.get.mockResolvedValue({ id: 'id', data: item, meta });

      const { item: result } = await getVegaVisualizationClient(http).get('id');

      expect(result.attributes).toEqual({
        title: 'My chart',
        description: 'A chart',
        spec: item.spec,
      });
      expect(result.references).toEqual([{ type: 'tag', id: 'tag-1', name: 'tag-ref-tag-1' }]);
    });

    it('merges the changes into the stored item, so the replace keeps the spec', async () => {
      http.get.mockResolvedValue({ id: 'id', data: item, meta });
      http.put.mockResolvedValue({
        id: 'id',
        data: { ...item, title: 'Renamed', tags: ['tag-2'] },
        meta,
      });

      await getVegaVisualizationClient(http).update({
        id: 'id',
        data: { title: 'Renamed', description: 'A chart', spec: item.spec },
        options: { references: [{ type: 'tag', id: 'tag-2', name: 'tag-ref-tag-2' }] },
      });

      expect(http.put).toHaveBeenCalledWith('/api/vega/id', {
        version: '2023-10-31',
        body: JSON.stringify({
          title: 'Renamed',
          description: 'A chart',
          spec: item.spec,
          tags: ['tag-2'],
        }),
      });
    });

    it('removes all tags when no tag references are given', async () => {
      http.get.mockResolvedValue({ id: 'id', data: item, meta });
      http.put.mockResolvedValue({ id: 'id', data: { ...item, tags: [] }, meta });

      await getVegaVisualizationClient(http).update({
        id: 'id',
        data: { title: 'My chart', spec: item.spec },
        options: { references: [] },
      });

      expect(JSON.parse((http.put.mock.calls[0][1] as { body: string }).body).tags).toEqual([]);
    });
  });
});
