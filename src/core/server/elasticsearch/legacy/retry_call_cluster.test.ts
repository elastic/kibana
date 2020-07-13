/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import * as legacyElasticsearch from 'elasticsearch';

import { retryCallCluster, migrationsRetryCallCluster } from './retry_call_cluster';
import { loggingSystemMock } from '../../logging/logging_system.mock';

describe('retryCallCluster', () => {
  it('retries ES API calls that rejects with NoConnections', () => {
    expect.assertions(1);
    const callEsApi = jest.fn();
    let i = 0;
    const ErrorConstructor = legacyElasticsearch.errors.NoConnections;
    callEsApi.mockImplementation(() => {
      return i++ <= 2 ? Promise.reject(new ErrorConstructor()) : Promise.resolve('success');
    });
    const retried = retryCallCluster(callEsApi);
    return expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
  });

  it('rejects when ES API calls reject with other errors', async () => {
    expect.assertions(3);
    const callEsApi = jest.fn();
    let i = 0;
    callEsApi.mockImplementation(() => {
      i++;

      return i === 1
        ? Promise.reject(new Error('unknown error'))
        : i === 2
        ? Promise.resolve('success')
        : i === 3 || i === 4
        ? Promise.reject(new legacyElasticsearch.errors.NoConnections())
        : i === 5
        ? Promise.reject(new Error('unknown error'))
        : null;
    });
    const retried = retryCallCluster(callEsApi);
    await expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
    await expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
    return expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
  });
});

describe('migrationsRetryCallCluster', () => {
  const errors = [
    'NoConnections',
    'ConnectionFault',
    'ServiceUnavailable',
    'RequestTimeout',
    'AuthenticationException',
    'AuthorizationException',
    'Gone',
  ];

  const mockLogger = loggingSystemMock.create();

  beforeEach(() => {
    loggingSystemMock.clear(mockLogger);
  });

  errors.forEach((errorName) => {
    it('retries ES API calls that rejects with ' + errorName, () => {
      expect.assertions(1);
      const callEsApi = jest.fn();
      let i = 0;
      const ErrorConstructor = (legacyElasticsearch.errors as any)[errorName];
      callEsApi.mockImplementation(() => {
        return i++ <= 2 ? Promise.reject(new ErrorConstructor()) : Promise.resolve('success');
      });
      const retried = migrationsRetryCallCluster(callEsApi, mockLogger.get('mock log'), 1);
      return expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
    });
  });

  it('retries ES API calls that rejects with snapshot_in_progress_exception', () => {
    expect.assertions(1);
    const callEsApi = jest.fn();
    let i = 0;
    callEsApi.mockImplementation(() => {
      return i++ <= 2
        ? Promise.reject({ body: { error: { type: 'snapshot_in_progress_exception' } } })
        : Promise.resolve('success');
    });
    const retried = migrationsRetryCallCluster(callEsApi, mockLogger.get('mock log'), 1);
    return expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
  });

  it('rejects when ES API calls reject with other errors', async () => {
    expect.assertions(3);
    const callEsApi = jest.fn();
    let i = 0;
    callEsApi.mockImplementation(() => {
      i++;

      return i === 1
        ? Promise.reject(new Error('unknown error'))
        : i === 2
        ? Promise.resolve('success')
        : i === 3 || i === 4
        ? Promise.reject(new legacyElasticsearch.errors.NoConnections())
        : i === 5
        ? Promise.reject(new Error('unknown error'))
        : null;
    });
    const retried = migrationsRetryCallCluster(callEsApi, mockLogger.get('mock log'), 1);
    await expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
    await expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
    return expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
  });

  it('logs only once for each unique error message', async () => {
    const callEsApi = jest.fn();
    callEsApi.mockRejectedValueOnce(new legacyElasticsearch.errors.NoConnections());
    callEsApi.mockRejectedValueOnce(new legacyElasticsearch.errors.NoConnections());
    callEsApi.mockRejectedValueOnce(new legacyElasticsearch.errors.AuthenticationException());
    callEsApi.mockResolvedValueOnce('done');
    const retried = migrationsRetryCallCluster(callEsApi, mockLogger.get('mock log'), 1);
    await retried('endpoint');
    expect(loggingSystemMock.collect(mockLogger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Unable to connect to Elasticsearch. Error: No Living connections",
        ],
        Array [
          "Unable to connect to Elasticsearch. Error: Authentication Exception",
        ],
      ]
    `);
  });
});
