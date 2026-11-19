/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 1".
 */

import * as Either from 'fp-ts/Either';
import type { TransportResult } from '@elastic/elasticsearch';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { waitForUpdateIndexMappingsTask } from './wait_for_update_index_mappings_task';

describe('waitForUpdateIndexMappingsTask', () => {
  it('reports a task that is neither running nor stored so the pickup can be rerun', async () => {
    const { client } = createErrorClient({
      statusCode: 404,
      body: {
        error: {
          type: 'resource_not_found_exception',
          reason: "task [abc:1] isn't running and hasn't stored its results",
        },
      },
    });

    const result = await waitForUpdateIndexMappingsTask({
      client,
      taskId: 'abc:1',
      timeout: '60s',
    })();

    expect(result).toEqual(
      Either.left({
        type: 'task_not_found',
        message: "task [abc:1] isn't running and hasn't stored its results",
        error: expect.any(EsErrors.ResponseError),
      })
    );
  });

  it('reports a task whose node has left the cluster', async () => {
    const reason =
      "task [abc:1] belongs to the node [abc] which isn't part of the cluster and there is no record of the task";
    const { client } = createErrorClient({
      statusCode: 404,
      body: {
        error: {
          type: 'resource_not_found_exception',
          reason,
        },
      },
    });

    const result = await waitForUpdateIndexMappingsTask({
      client,
      taskId: 'abc:1',
      timeout: '60s',
    })();

    expect(Either.isLeft(result) && result.left).toEqual(
      expect.objectContaining({
        type: 'task_not_found',
        message: reason,
      })
    );
  });

  it('rethrows a 404 that is not a lost task', async () => {
    const { client, error } = createErrorClient({
      statusCode: 404,
      body: {
        error: {
          type: 'index_not_found_exception',
          reason: 'no such index [.kibana]',
        },
      },
    });

    const task = waitForUpdateIndexMappingsTask({
      client,
      taskId: 'abc:1',
      timeout: '60s',
    });

    await expect(task()).rejects.toEqual(error);
  });

  it('rethrows a resource_not_found_exception that is not a lost task', async () => {
    const { client, error } = createErrorClient({
      statusCode: 404,
      body: {
        error: {
          type: 'resource_not_found_exception',
          reason: 'required alias [.kibana] does not exist',
        },
      },
    });

    const task = waitForUpdateIndexMappingsTask({
      client,
      taskId: 'abc:1',
      timeout: '60s',
    });

    await expect(task()).rejects.toEqual(error);
  });
});

const createErrorClient = (esResponse: Partial<TransportResult>) => {
  const error = new EsErrors.ResponseError(elasticsearchClientMock.createApiResponse(esResponse));
  const client = elasticsearchClientMock.createInternalClient(
    elasticsearchClientMock.createErrorTransportRequestPromise(error)
  );

  return { client, error };
};
