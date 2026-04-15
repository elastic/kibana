/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';

import { NpreClient } from './npre_client';

describe('NpreClient', () => {
  let service: NpreClient;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockScopedClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();

    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();

    service = new NpreClient(mockLogger, mockScopedClient);
  });

  describe('getNpre', () => {
    it('should retrieve a project routing expression', async () => {
      const expressionName = 'test-expression';
      const mockExpression = 'project:test';
      const mockResponse = { expression: mockExpression };

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue(mockResponse);

      const result = await service.getNpre(expressionName);

      expect(result).toEqual(mockExpression);
      expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting NPRE for expression: test-expression');
    });

    it('should return undefined when expression is not found (404)', async () => {
      const expressionName = 'nonexistent-expression';
      const error = new errors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            type: 'resource_not_found_exception',
            reason: 'Expression not found',
          },
        },
        warnings: [],
        headers: {},
        meta: {} as any,
      });

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      const result = await service.getNpre(expressionName);

      expect(result).toBeUndefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log and throw error on non-404 failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch connection error');

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      await expect(service.getNpre(expressionName)).rejects.toThrow(
        'Elasticsearch connection error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get project routing expression test-expression')
      );
    });

    it('should handle other error types and log them', async () => {
      const expressionName = 'test-expression';
      const error = new errors.ResponseError({
        statusCode: 500,
        body: {
          error: {
            type: 'internal_server_error',
            reason: 'Something went wrong',
          },
        },
        warnings: [],
        headers: {},
        meta: {} as any,
      });

      mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(error);

      await expect(service.getNpre(expressionName)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get project routing expression test-expression')
      );
    });
  });

  describe('canGetNpre', () => {
    it("should return true when user has 'cluster:monitor/project_routing/get' privilege", async () => {
      mockScopedClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as any);

      const result = await service.canGetNpre();

      expect(result).toBe(true);
      expect(mockScopedClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
        cluster: ['cluster:monitor/project_routing/get'],
      });
    });

    it('should return false when user does not have get cluster privilege', async () => {
      mockScopedClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as any);

      const result = await service.canGetNpre();

      expect(result).toBe(false);
    });
  });

  describe('canPutNpre', () => {
    it("should return true when user has 'cluster:admin/project_routing/put' privilege", async () => {
      mockScopedClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as any);

      const result = await service.canPutNpre();

      expect(result).toBe(true);
      expect(mockScopedClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
        cluster: ['cluster:admin/project_routing/put'],
      });
    });

    it('should return false when user does not have manage cluster privilege', async () => {
      mockScopedClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as any);

      const result = await service.canPutNpre();

      expect(result).toBe(false);
    });
  });

  describe('putNpre', () => {
    it('should create or update a project routing expression', async () => {
      const expressionName = 'test-expression';
      const expression = 'project:test';
      const mockResponse = { acknowledged: true };

      mockScopedClient.asCurrentUser.transport.request.mockResolvedValue(mockResponse);

      const result = await service.putNpre(expressionName, expression);

      expect(result).toEqual(mockResponse);
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
      const mockResponse = { acknowledged: true };

      mockScopedClient.asInternalUser.transport.request.mockResolvedValue(mockResponse);

      const result = await service.deleteNpre(expressionName);

      expect(result).toEqual(mockResponse);
      expect(mockScopedClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Deleting NPRE for expression: test-expression'
      );
    });

    it('should log and throw error on failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch error');

      mockScopedClient.asInternalUser.transport.request.mockRejectedValue(error);

      await expect(service.deleteNpre(expressionName)).rejects.toThrow('Elasticsearch error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete project routing expression test-expression: Elasticsearch error'
      );
    });

    it('should handle deletion of non-existent expression', async () => {
      const expressionName = 'nonexistent-expression';
      const error = new errors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            type: 'resource_not_found_exception',
            reason: 'Expression not found',
          },
        },
        warnings: [],
        headers: {},
        meta: {} as any,
      });

      mockScopedClient.asInternalUser.transport.request.mockRejectedValue(error);

      await expect(service.deleteNpre(expressionName)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete project routing expression')
      );
    });
  });
});
