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
import { initAction } from './initialize_action';

jest.mock('./catch_retryable_es_client_errors');

describe('initAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const task = initAction({ client, indices: ['my_index'] });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });
  it('resolves right when persistent and transient cluster settings are compatible', async () => {
    const clusterSettingsResponse = {
      transient: { 'cluster.routing.allocation.enable': 'all' },
      persistent: { 'cluster.routing.allocation.enable': 'all' },
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
  it('resolves right when persistent and transient cluster settings are undefined', async () => {
    const clusterSettingsResponse = {
      transient: {},
      persistent: {},
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
  it('resolves right when persistent cluster settings are compatible', async () => {
    const clusterSettingsResponse = {
      transient: {},
      persistent: { 'cluster.routing.allocation.enable': 'all' },
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
  it('resolves right when transient cluster settings are compatible', async () => {
    const clusterSettingsResponse = {
      transient: { 'cluster.routing.allocation.enable': 'all' },
      persistent: {},
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
  it('resolves right when valid transient settings, incompatible persistent settings', async () => {
    const clusterSettingsResponse = {
      transient: { 'cluster.routing.allocation.enable': 'all' },
      persistent: { 'cluster.routing.allocation.enable': 'primaries' },
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isRight(result)).toEqual(true);
  });
  it('resolves left when valid persistent settings, incompatible transient settings', async () => {
    const clusterSettingsResponse = {
      transient: { 'cluster.routing.allocation.enable': 'primaries' },
      persistent: { 'cluster.routing.allocation.enable': 'alls' },
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isLeft(result)).toEqual(true);
  });
  it('resolves left when transient cluster settings are incompatible', async () => {
    const clusterSettingsResponse = {
      transient: { 'cluster.routing.allocation.enable': 'none' },
      persistent: { 'cluster.routing.allocation.enable': 'all' },
    };
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    const result = await task();
    expect(Either.isLeft(result)).toEqual(true);
  });
});
