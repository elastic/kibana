/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext, SavedObjectsClientContract } from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  createSavedSnippet,
  updateSavedSnippet,
  deleteSavedSnippet,
  getSavedSnippet,
  findSavedSnippets,
} from './route_handlers';
import { CONSOLE_SNIPPET_SAVED_OBJECT_TYPE } from '../../../../../common/constants';

describe('Route Handlers', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockContext: RequestHandlerContext;

  beforeEach(() => {
    mockSavedObjectsClient = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      find: jest.fn(),
    } as any;

    mockContext = {
      core: Promise.resolve({
        savedObjects: {
          client: mockSavedObjectsClient,
        },
      }),
    } as any;
  });

  describe('createSavedSnippet', () => {
    it('should create a snippet with titleKeyword', async () => {
      const attributes = {
        title: 'Test Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      mockSavedObjectsClient.create.mockResolvedValue({
        id: 'test-id',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: {
          ...attributes,
          titleKeyword: 'Test Snippet',
        },
        references: [],
        updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await createSavedSnippet(mockContext, attributes);

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          title: 'Test Snippet',
          titleKeyword: 'Test Snippet',
          description: 'Test description',
          query: 'GET /_search',
        })
      );

      expect(result).toEqual({
        id: 'test-id',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: expect.objectContaining({
          title: 'Test Snippet',
        }),
        updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should trim title when creating titleKeyword', async () => {
      const attributes = {
        title: '  Test Snippet  ',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      mockSavedObjectsClient.create.mockResolvedValue({
        id: 'test-id',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: {
          ...attributes,
          titleKeyword: 'Test Snippet',
        },
        references: [],
      } as any);

      await createSavedSnippet(mockContext, attributes);

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          titleKeyword: 'Test Snippet',
        })
      );
    });

    it('should throw conflict error if snippet with same title already exists', async () => {
      const attributes = {
        title: 'Existing Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            id: 'existing-id',
            type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
            attributes,
            references: [],
            score: 1,
          },
        ],
        per_page: 20,
        page: 1,
      });

      await expect(createSavedSnippet(mockContext, attributes)).rejects.toThrow(
        Boom.conflict('A snippet with this title already exists')
      );

      expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('should search for duplicates using titleKeyword field', async () => {
      const attributes = {
        title: 'Test Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      mockSavedObjectsClient.create.mockResolvedValue({
        id: 'test-id',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes,
        references: [],
      } as any);

      await createSavedSnippet(mockContext, attributes);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        searchFields: ['titleKeyword'],
        search: '"Test Snippet"',
      });
    });
  });

  describe('updateSavedSnippet', () => {
    it('should update a snippet with new attributes', async () => {
      const id = 'test-id';
      const attributes = {
        title: 'Updated Snippet',
        description: 'Updated description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      mockSavedObjectsClient.update.mockResolvedValue({
        id,
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: {
          ...attributes,
          titleKeyword: 'Updated Snippet',
        },
        references: [],
        updated_at: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await updateSavedSnippet(mockContext, id, attributes);

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        id,
        expect.objectContaining({
          title: 'Updated Snippet',
          titleKeyword: 'Updated Snippet',
        })
      );

      expect(result).toEqual({
        id,
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes,
        updated_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should allow update if duplicate title belongs to the same snippet', async () => {
      const id = 'test-id';
      const attributes = {
        title: 'Test Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            id, // Same ID as the one being updated
            type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
            attributes,
            references: [],
            score: 1,
          },
        ],
        per_page: 20,
        page: 1,
      });

      mockSavedObjectsClient.update.mockResolvedValue({
        id,
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes,
        references: [],
      } as any);

      await expect(updateSavedSnippet(mockContext, id, attributes)).resolves.not.toThrow();
    });

    it('should throw conflict error if another snippet has the same title', async () => {
      const id = 'test-id';
      const attributes = {
        title: 'Existing Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            id: 'different-id', // Different ID
            type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
            attributes,
            references: [],
            score: 1,
          },
        ],
        per_page: 20,
        page: 1,
      });

      await expect(updateSavedSnippet(mockContext, id, attributes)).rejects.toThrow(
        Boom.conflict('A snippet with this title already exists')
      );

      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSavedSnippet', () => {
    it('should delete a snippet by id', async () => {
      const id = 'test-id';

      mockSavedObjectsClient.delete.mockResolvedValue({});

      await deleteSavedSnippet(mockContext, id);

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        id
      );
    });
  });

  describe('getSavedSnippet', () => {
    it('should get a snippet by id', async () => {
      const id = 'test-id';
      const attributes = {
        title: 'Test Snippet',
        description: 'Test description',
        query: 'GET /_search',
      };

      mockSavedObjectsClient.get.mockResolvedValue({
        id,
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes,
        references: [],
        updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await getSavedSnippet(mockContext, id);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        id
      );

      expect(result).toEqual({
        id,
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes,
        updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('findSavedSnippets', () => {
    it('should find snippets with default pagination', async () => {
      const snippets = [
        {
          id: 'snippet-1',
          type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
          attributes: {
            title: 'Snippet 1',
            query: 'GET /_search',
          },
          references: [],
          score: 1,
        },
        {
          id: 'snippet-2',
          type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
          attributes: {
            title: 'Snippet 2',
            query: 'GET /_cat/indices',
          },
          references: [],
          score: 1,
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        total: 2,
        saved_objects: snippets,
        per_page: 20,
        page: 1,
      });

      const result = await findSavedSnippets(mockContext);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        search: undefined,
        searchFields: ['title', 'description', 'tags'],
        perPage: 20,
        page: 1,
        sortField: 'updated_at',
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        total: 2,
        snippets: expect.arrayContaining([
          expect.objectContaining({ id: 'snippet-1' }),
          expect.objectContaining({ id: 'snippet-2' }),
        ]),
      });
    });

    it('should find snippets with search term', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            id: 'snippet-1',
            type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
            attributes: {
              title: 'Search Snippet',
              query: 'GET /_search',
            },
            references: [],
            score: 1,
          },
        ],
        per_page: 20,
        page: 1,
      });

      await findSavedSnippets(mockContext, 'search');

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'search',
          searchFields: ['title', 'description', 'tags'],
        })
      );
    });

    it('should support custom pagination', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        total: 100,
        saved_objects: [],
        per_page: 50,
        page: 2,
      });

      await findSavedSnippets(mockContext, undefined, 50, 2);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          perPage: 50,
          page: 2,
        })
      );
    });

    it('should sort by updated_at descending', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      await findSavedSnippets(mockContext);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'updated_at',
          sortOrder: 'desc',
        })
      );
    });
  });
});
