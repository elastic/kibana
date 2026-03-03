/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  removeLockIndexWithIncorrectMappings,
  ensureTemplatesAndIndexCreated,
  LOCKS_CONCRETE_INDEX_NAME,
} from './setup_lock_manager_index';

describe('removeLockIndexWithIncorrectMappings', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  const logger = loggingSystemMock.createLogger();

  const correctMappings: MappingTypeMapping = {
    dynamic: 'false',
    properties: {
      token: { type: 'keyword' },
      expiresAt: { type: 'date' },
      createdAt: { type: 'date' },
      metadata: { enabled: false, type: 'object' },
    },
  };

  const incorrectMappings: MappingTypeMapping = {
    dynamic: 'false',
    properties: {
      token: { type: 'text' }, // incorrect - should be keyword
      expiresAt: { type: 'text' }, // incorrect - should be date
      createdAt: { type: 'date' },
      metadata: { enabled: false, type: 'object' },
    },
  };

  beforeEach(() => {
    esClient = elasticsearchClientMock.createInternalClient();
  });

  describe('when index name matches LOCKS_CONCRETE_INDEX_NAME', () => {
    it('does not delete index when mappings are correct', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [LOCKS_CONCRETE_INDEX_NAME]: { mappings: correctMappings },
      });

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('deletes index when mappings are incorrect', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [LOCKS_CONCRETE_INDEX_NAME]: { mappings: incorrectMappings },
      });

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: LOCKS_CONCRETE_INDEX_NAME });
    });
  });

  describe('when index is accessed via alias (response key differs from requested index)', () => {
    const reindexedIndexName = `${LOCKS_CONCRETE_INDEX_NAME}-reindexed-for-10`;

    it('does not delete index when mappings are correct', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [reindexedIndexName]: { mappings: correctMappings },
      });

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('deletes index when mappings are incorrect', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [reindexedIndexName]: { mappings: incorrectMappings },
      });

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: LOCKS_CONCRETE_INDEX_NAME });
    });
  });

  describe('when index does not exist (404 error)', () => {
    it('returns early without error', async () => {
      esClient.indices.getMapping.mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode: 404,
          body: { error: { type: 'index_not_found_exception' } },
          headers: {},
          meta: {} as any,
          warnings: [],
        })
      );

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });
  });

  describe('when getMapping returns empty response', () => {
    it('returns early without error', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({});

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });
  });

  describe('when mappings object is empty', () => {
    it('returns early without error', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [LOCKS_CONCRETE_INDEX_NAME]: { mappings: undefined as any },
      });

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });
  });

  describe('when getMapping fails with non-404 error', () => {
    it('returns without throwing', async () => {
      esClient.indices.getMapping.mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode: 500,
          body: { error: { type: 'internal_server_error' } },
          headers: {},
          meta: {} as any,
          warnings: [],
        })
      );

      await removeLockIndexWithIncorrectMappings(esClient, logger);

      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });
  });

  describe('when delete fails', () => {
    it('does not throw', async () => {
      esClient.indices.getMapping.mockResolvedValueOnce({
        [LOCKS_CONCRETE_INDEX_NAME]: { mappings: incorrectMappings },
      });
      esClient.indices.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(removeLockIndexWithIncorrectMappings(esClient, logger)).resolves.not.toThrow();
    });
  });
});

describe('ensureTemplatesAndIndexCreated', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    esClient = elasticsearchClientMock.createInternalClient();
  });

  it('creates index successfully', async () => {
    await ensureTemplatesAndIndexCreated(esClient, logger);

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.create).toHaveBeenCalledWith({ index: LOCKS_CONCRETE_INDEX_NAME });
  });

  it('handles resource_already_exists_exception without throwing', async () => {
    esClient.indices.create.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
        headers: {},
        meta: {} as any,
        warnings: [],
      })
    );

    await expect(ensureTemplatesAndIndexCreated(esClient, logger)).resolves.not.toThrow();
  });

  it('handles invalid_index_name_exception (index name exists as alias) without throwing', async () => {
    esClient.indices.create.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'invalid_index_name_exception' } },
        headers: {},
        meta: {} as any,
        warnings: [],
      })
    );

    await expect(ensureTemplatesAndIndexCreated(esClient, logger)).resolves.not.toThrow();
  });

  it('throws on other errors', async () => {
    esClient.indices.create.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 500,
        body: { error: { type: 'internal_server_error' } },
        headers: {},
        meta: {} as any,
        warnings: [],
      })
    );

    await expect(ensureTemplatesAndIndexCreated(esClient, logger)).rejects.toThrow();
  });
});
