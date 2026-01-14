/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core/server';

import { NpreClient } from './npre_client';

describe('NpreClient', () => {
  let service: NpreClient;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockCoreStart: CoreStart;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockScopedClient: ReturnType<
    ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asScoped']
  >;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    mockRequest = httpServerMock.createKibanaRequest();

    const mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();

    mockCoreStart = {
      elasticsearch: {
        client: {
          ...mockClusterClient,
          asScoped: () => mockScopedClient,
        },
      },
    } as unknown as CoreStart;

    service = new NpreClient(mockLogger, mockCoreStart, mockRequest);
  });

  describe('getNpre', () => {
    it('should retrieve a project routing expression', async () => {
      const expressionName = 'test-expression';
      const mockResponse = { expression: 'project:test' };

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue(mockResponse);

      const result = await service.getNpre(expressionName);

      expect(result).toEqual(mockResponse);
      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting NPRE for expression: test-expression');
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';
      const mockResponse = { expression: 'project:test' };

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue(mockResponse);

      await service.getNpre(expressionName);

      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_project_routing/test%2Fexpression%20with%20spaces',
      });
    });

    it('should return undefined expression on 404 error', async () => {
      const expressionName = 'test-expression';
      const error = {
        name: 'ResponseError',
        body: {
          error: {
            type: 'resource_not_found_exception',
          },
        },
      };

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      const result = await service.getNpre(expressionName);

      expect(result).toEqual({ expression: undefined });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Project routing expression test-expression not found, returning undefined'
      );
    });

    it('should log and throw error on non-404 failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch error');

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      await expect(service.getNpre(expressionName)).rejects.toThrow('Elasticsearch error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get project routing expression test-expression: Elasticsearch error'
      );
    });
  });

  describe('putNpre', () => {
    it('should create or update a project routing expression', async () => {
      const expressionName = 'test-expression';
      const expression = 'project:test';

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({});

      await service.putNpre(expressionName, expression);

      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_project_routing/test-expression',
        body: {
          expression: 'project:test',
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Putting NPRE for expression: test-expression with value: project:test'
      );
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';
      const expression = 'project:test';

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({});

      await service.putNpre(expressionName, expression);

      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_project_routing/test%2Fexpression%20with%20spaces',
        body: {
          expression: 'project:test',
        },
      });
    });

    it('should log and throw error on failure', async () => {
      const expressionName = 'test-expression';
      const expression = 'project:test';
      const error = new Error('Elasticsearch error');

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      await expect(service.putNpre(expressionName, expression)).rejects.toThrow(
        'Elasticsearch error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to put project routing expression test-expression: Elasticsearch error'
      );
    });
  });

  describe('deleteNpre', () => {
    it('should delete a project routing expression', async () => {
      const expressionName = 'test-expression';

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({});

      await service.deleteNpre(expressionName);

      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Deleting NPRE for expression: test-expression'
      );
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({});

      await service.deleteNpre(expressionName);

      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_project_routing/test%2Fexpression%20with%20spaces',
      });
    });

    it('should log and throw error on failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch error');

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      await expect(service.deleteNpre(expressionName)).rejects.toThrow('Elasticsearch error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete project routing expression test-expression: Elasticsearch error'
      );
    });
  });
});
