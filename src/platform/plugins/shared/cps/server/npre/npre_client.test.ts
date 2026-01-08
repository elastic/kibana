/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { NpreClient } from './npre_client';

describe('NpreService', () => {
  let service: NpreClient;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    service = new NpreClient(mockLogger, mockClusterClient);
  });

  describe('getNpre', () => {
    it('should retrieve a project routing expression', async () => {
      const expressionName = 'test-expression';
      const mockResponse = { expression: 'project:test' };

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue(mockResponse);

      const result = await service.getNpre(expressionName);

      expect(result).toEqual(mockResponse);
      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'NpreService.getNpre() for expression: test-expression'
      );
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';
      const mockResponse = { expression: 'project:test' };

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue(mockResponse);

      await service.getNpre(expressionName);

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_project_routing/test%2Fexpression%20with%20spaces',
      });
    });

    it('should log and throw error on failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch error');

      mockClusterClient.asInternalUser.transport.request.mockRejectedValue(error);

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

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue({});

      await service.putNpre(expressionName, expression);

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_project_routing/test-expression',
        body: {
          expression: 'project:test',
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'NpreService.putNpre() for expression: test-expression'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Successfully created/updated project routing expression test-expression'
      );
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';
      const expression = 'project:test';

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue({});

      await service.putNpre(expressionName, expression);

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
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

      mockClusterClient.asInternalUser.transport.request.mockRejectedValue(error);

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

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue({});

      await service.deleteNpre(expressionName);

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_project_routing/test-expression',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'NpreService.deleteNpre() for expression: test-expression'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Successfully deleted project routing expression test-expression'
      );
    });

    it('should handle special characters in expression name', async () => {
      const expressionName = 'test/expression with spaces';

      mockClusterClient.asInternalUser.transport.request.mockResolvedValue({});

      await service.deleteNpre(expressionName);

      expect(mockClusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_project_routing/test%2Fexpression%20with%20spaces',
      });
    });

    it('should log and throw error on failure', async () => {
      const expressionName = 'test-expression';
      const error = new Error('Elasticsearch error');

      mockClusterClient.asInternalUser.transport.request.mockRejectedValue(error);

      await expect(service.deleteNpre(expressionName)).rejects.toThrow('Elasticsearch error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete project routing expression test-expression: Elasticsearch error'
      );
    });
  });
});
