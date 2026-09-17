/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ensureAnnotationsIndex } from './ensure_index';

const responseError = (type: string) =>
  new errors.ResponseError(
    elasticsearchServiceMock.createApiResponse({ statusCode: 400, body: { error: { type } } })
  );

describe('ensureAnnotationsIndex', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('leaves an existing index alone', async () => {
    esClient.indices.exists.mockResponseOnce(true);

    await ensureAnnotationsIndex(esClient, logger);

    expect(esClient.indices.create).not.toHaveBeenCalled();
  });

  it('tolerates the index being created by someone else in the meantime', async () => {
    esClient.indices.exists.mockResponseOnce(false);
    esClient.indices.create.mockRejectedValueOnce(
      responseError('resource_already_exists_exception')
    );

    await expect(ensureAnnotationsIndex(esClient, logger)).resolves.toBeUndefined();
  });

  it('reports any other failure', async () => {
    esClient.indices.exists.mockResponseOnce(false);
    esClient.indices.create.mockRejectedValueOnce(responseError('security_exception'));

    await expect(ensureAnnotationsIndex(esClient, logger)).rejects.toThrow();
  });
});
