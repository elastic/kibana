/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { initAction, type InitActionParams } from './initialize_action';

jest.mock('./catch_retryable_es_client_errors');

describe('initAction', () => {
  let initActionParams: Omit<InitActionParams, 'client'>;

  beforeEach(() => {
    jest.clearAllMocks();

    initActionParams = {
      indices: ['.kibana', '.kibana_8.8.0'],
    };
  });
  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );
    const task = initAction({ ...initActionParams, client });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it.each([
    {
      clusterSettingsResponse: {
        transient: { 'cluster.routing.allocation.enable': 'primaries' },
        persistent: { 'cluster.routing.allocation.enable': 'alls' },
      },
      case: 'resolves left when valid persistent settings, incompatible transient settings',
    },
    {
      clusterSettingsResponse: {
        transient: { 'cluster.routing.allocation.enable': 'none' },
        persistent: { 'cluster.routing.allocation.enable': 'all' },
      },
      case: 'resolves left when transient cluster settings are incompatible',
    },
  ])('$case', async ({ clusterSettingsResponse }) => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve(clusterSettingsResponse)
    );
    const task = initAction({ ...initActionParams, client });
    const result = await task();
    expect(Either.isLeft(result)).toEqual(true);
  });

  it.each([
    {
      clusterSettingsResponse: {
        transient: { 'cluster.routing.allocation.enable': 'all' },
        persistent: { 'cluster.routing.allocation.enable': 'all' },
      },
      case: 'resolves right when persistent and transient cluster settings are compatible',
    },
    {
      clusterSettingsResponse: {
        transient: {},
        persistent: {},
      },
      case: 'resolves right when persistent and transient cluster settings are undefined',
    },
    {
      clusterSettingsResponse: {
        transient: {},
        persistent: { 'cluster.routing.allocation.enable': 'all' },
      },
      case: 'resolves right when persistent cluster settings are compatible',
    },
    {
      clusterSettingsResponse: {
        transient: { 'cluster.routing.allocation.enable': 'all' },
        persistent: {},
      },
      case: 'resolves right when transient cluster settings are compatible',
    },
    {
      clusterSettingsResponse: {
        transient: { 'cluster.routing.allocation.enable': 'all' },
        persistent: { 'cluster.routing.allocation.enable': 'primaries' },
      },
      case: 'resolves right when valid transient settings, incompatible persistent settings',
    },
  ])('$case', async ({ clusterSettingsResponse }) => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve(clusterSettingsResponse)
    );
    const task = initAction({ ...initActionParams, client });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
});
