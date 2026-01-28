/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchItemsStrategy, type UserInfo } from './strategy';

/**
 * Minimal mock HTTP client for testing. Only includes the methods we need.
 */
interface MockHttpClient {
  post: jest.Mock<
    Promise<unknown>,
    [string, { version: string; body: string; signal?: AbortSignal }]
  >;
}

/**
 * Creates a mock HTTP client with a typed `post` method.
 */
const createMockHttp = (): MockHttpClient => ({
  post: jest.fn(),
});

/**
 * Extracts and parses the request body from a mock HTTP post call.
 */
const getRequestBody = (http: MockHttpClient): Record<string, unknown> => {
  const [, options] = http.post.mock.calls[0];
  return JSON.parse(options.body);
};

/**
 * Creates a mock list response with properly typed user info.
 */
const createMockListResponse = (
  items: Array<{ id: string; title: string }> = [],
  options: { users?: Record<string, UserInfo>; resolvedFilters?: object } = {}
) => ({
  items: items.map((item, i) => ({
    id: item.id,
    type: 'map',
    updatedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: `user-${i + 1}`,
    updatedBy: `user-${i + 1}`,
    managed: false,
    references: [{ type: 'tag', id: 'tag-1', name: 'Tag 1' }],
    attributes: {
      title: item.title,
      description: `Description for ${item.title}`,
    },
  })),
  total: items.length,
  users: options.users,
  resolvedFilters: options.resolvedFilters,
});

const defaultFindParams = {
  searchQuery: '',
  filters: { tags: { include: [], exclude: [] } },
  sort: { field: 'updatedAt', direction: 'desc' as const },
  page: { index: 0, size: 10 },
};

describe('createSearchItemsStrategy', () => {
  it('creates a findItems function', () => {
    const http = createMockHttp();

    const { findItems } = createSearchItemsStrategy({
      savedObjectType: 'map',
      // Cast to HttpStart since we only mock the methods we need.
      http: http as never,
    });

    expect(typeof findItems).toBe('function');
  });

  describe('findItems', () => {
    it('posts to the content management list API', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(
        createMockListResponse([
          { id: '1', title: 'Map 1' },
          { id: '2', title: 'Map 2' },
        ])
      );

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      const result = await findItems(defaultFindParams);

      expect(http.post).toHaveBeenCalledWith('/internal/content_management/list', {
        version: '1',
        body: expect.any(String),
        signal: undefined,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('transforms list response items to UserContentCommonSchema', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([{ id: '1', title: 'My Map' }]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      const result = await findItems(defaultFindParams);

      expect(result.items[0]).toMatchObject({
        id: '1',
        type: 'map',
        attributes: {
          title: 'My Map',
          description: 'Description for My Map',
        },
        references: [{ type: 'tag', id: 'tag-1', name: 'Tag 1' }],
      });
    });

    it('includes user info from response when available', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(
        createMockListResponse([{ id: '1', title: 'My Map' }], {
          users: {
            'user-1': {
              username: 'john.doe',
              email: 'john@example.com',
              fullName: 'John Doe',
            },
          },
        })
      );

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      const result = await findItems(defaultFindParams);

      expect(result.items[0]).toMatchObject({
        createdByUser: {
          username: 'john.doe',
          email: 'john@example.com',
          fullName: 'John Doe',
        },
        updatedByUser: {
          username: 'john.doe',
          email: 'john@example.com',
          fullName: 'John Doe',
        },
      });
    });

    it('sends search query when provided', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        searchQuery: 'test search',
      });

      const body = getRequestBody(http);
      expect(body.searchQuery).toBe('test search');
    });

    it('sends tag filters when provided', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: ['tag-1', 'tag-2'], exclude: ['tag-3'] },
        },
      });

      const body = getRequestBody(http);
      expect(body.tags).toEqual({
        include: ['tag-1', 'tag-2'],
        exclude: ['tag-3'],
      });
    });

    it('sends favoritesOnly filter when starredOnly is provided', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: [], exclude: [] },
          starredOnly: true,
        },
      });

      const body = getRequestBody(http);
      expect(body.favoritesOnly).toBe(true);
    });

    it('sends createdBy filter when users filter is provided', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: [], exclude: [] },
          users: ['user-1', 'user-2'],
        },
      });

      const body = getRequestBody(http);
      expect(body.createdBy).toEqual(['user-1', 'user-2']);
    });

    it('sends sort options to server', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        sort: { field: 'title', direction: 'asc' },
      });

      const body = getRequestBody(http);
      expect(body.sort).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });

    it('sends pagination options to server', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        page: { index: 2, size: 25 },
      });

      const body = getRequestBody(http);
      expect(body.page).toEqual({
        index: 2,
        size: 25,
      });
    });

    it('supports multiple saved object types', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: ['map', 'dashboard', 'visualization'],
        http: http as never,
      });

      await findItems(defaultFindParams);

      const body = getRequestBody(http);
      expect(body.type).toEqual(['map', 'dashboard', 'visualization']);
    });

    it('sends additional attributes when searchFieldsConfig is provided', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
        searchFieldsConfig: {
          additionalAttributes: ['status', 'version'],
        },
      });

      await findItems(defaultFindParams);

      const body = getRequestBody(http);
      expect(body.additionalAttributes).toEqual(['status', 'version']);
    });

    it('includes custom attributes in transformed items', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue({
        items: [
          {
            id: '1',
            type: 'map',
            updatedAt: '2024-01-01T00:00:00Z',
            references: [],
            attributes: {
              title: 'My Map',
              description: 'A map',
              status: 'published',
              version: '2.0',
            },
          },
        ],
        total: 1,
      });

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
        searchFieldsConfig: {
          additionalAttributes: ['status', 'version'],
        },
      });

      const result = await findItems(defaultFindParams);

      expect(result.items[0].attributes).toEqual({
        title: 'My Map',
        description: 'A map',
        status: 'published',
        version: '2.0',
      });
    });

    it('includes resolvedFilters in result when returned by API', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(
        createMockListResponse([{ id: '1', title: 'Map 1' }], {
          resolvedFilters: {
            createdBy: { 'john.doe': 'user-123' },
          },
        })
      );

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      const result = await findItems(defaultFindParams);

      expect(result.resolvedFilters).toEqual({
        createdBy: { 'john.doe': 'user-123' },
      });
    });

    describe('error handling', () => {
      it('returns empty result on AbortError without logging', async () => {
        const http = createMockHttp();

        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        http.post.mockRejectedValue(abortError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { findItems } = createSearchItemsStrategy({
          savedObjectType: 'map',
          http: http as never,
        });

        const result = await findItems(defaultFindParams);

        expect(result).toEqual({ items: [], total: 0 });
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('returns empty result and logs other errors', async () => {
        const http = createMockHttp();

        http.post.mockRejectedValue(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { findItems } = createSearchItemsStrategy({
          savedObjectType: 'map',
          http: http as never,
        });

        const result = await findItems(defaultFindParams);

        expect(result).toEqual({ items: [], total: 0 });
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error searching saved objects:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    it('passes abort signal to HTTP request', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      const controller = new AbortController();

      await findItems({
        ...defaultFindParams,
        signal: controller.signal,
      });

      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_management/list',
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });

    it('uses provided sort field and direction', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        sort: { field: 'createdAt', direction: 'asc' },
      });

      const body = getRequestBody(http);
      expect(body.sort).toEqual({
        field: 'createdAt',
        direction: 'asc',
      });
    });

    it('omits tags from request when no filters are set', async () => {
      const http = createMockHttp();

      http.post.mockResolvedValue(createMockListResponse([]));

      const { findItems } = createSearchItemsStrategy({
        savedObjectType: 'map',
        http: http as never,
      });

      await findItems({
        ...defaultFindParams,
        filters: { tags: { include: [], exclude: [] } },
      });

      const body = getRequestBody(http);
      expect(body.tags).toBeUndefined();
    });
  });
});
