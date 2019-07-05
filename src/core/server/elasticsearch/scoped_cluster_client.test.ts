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

import { ScopedClusterClient } from './scoped_cluster_client';

let internalAPICaller: jest.Mock;
let scopedAPICaller: jest.Mock;
let clusterClient: ScopedClusterClient;
beforeEach(() => {
  internalAPICaller = jest.fn();
  scopedAPICaller = jest.fn();
  clusterClient = new ScopedClusterClient(internalAPICaller, scopedAPICaller, { one: '1' });
});

afterEach(() => jest.clearAllMocks());

describe('#callAsInternalUser', () => {
  test('properly forwards arguments to the API caller and results back from it', async () => {
    const mockResponse = { data: 'response' };
    internalAPICaller.mockResolvedValue(mockResponse);

    await expect(clusterClient.callAsInternalUser('ping')).resolves.toBe(mockResponse);
    expect(internalAPICaller).toHaveBeenCalledTimes(1);
    expect(internalAPICaller).toHaveBeenCalledWith('ping', {}, undefined);
    internalAPICaller.mockClear();

    await expect(
      clusterClient.callAsInternalUser('security.authenticate', { some: 'some' })
    ).resolves.toBe(mockResponse);
    expect(internalAPICaller).toHaveBeenCalledTimes(1);
    expect(internalAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some' },
      undefined
    );
    internalAPICaller.mockClear();

    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: true })
    ).resolves.toBe(mockResponse);
    expect(internalAPICaller).toHaveBeenCalledTimes(1);
    expect(internalAPICaller).toHaveBeenCalledWith('ping', {}, { wrap401Errors: true });
    internalAPICaller.mockClear();

    await expect(
      clusterClient.callAsInternalUser(
        'security.authenticate',
        { some: 'some' },
        { wrap401Errors: true }
      )
    ).resolves.toBe(mockResponse);
    expect(internalAPICaller).toHaveBeenCalledTimes(1);
    expect(internalAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some' },
      { wrap401Errors: true }
    );

    expect(scopedAPICaller).not.toHaveBeenCalled();
  });

  test('properly forwards errors returned by the API caller', async () => {
    const mockErrorResponse = new Error('some-error');
    internalAPICaller.mockRejectedValue(mockErrorResponse);

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(mockErrorResponse);

    expect(scopedAPICaller).not.toHaveBeenCalled();
  });
});

describe('#callAsCurrentUser', () => {
  test('properly forwards arguments to the API caller and results back from it', async () => {
    const mockResponse = { data: 'response' };
    scopedAPICaller.mockResolvedValue(mockResponse);

    await expect(clusterClient.callAsCurrentUser('ping')).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith('ping', { headers: { one: '1' } }, undefined);
    scopedAPICaller.mockClear();

    await expect(
      clusterClient.callAsCurrentUser('security.authenticate', { some: 'some' })
    ).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some', headers: { one: '1' } },
      undefined
    );
    scopedAPICaller.mockClear();

    await expect(
      clusterClient.callAsCurrentUser('ping', undefined, { wrap401Errors: true })
    ).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith(
      'ping',
      { headers: { one: '1' } },
      { wrap401Errors: true }
    );
    scopedAPICaller.mockClear();

    await expect(
      clusterClient.callAsCurrentUser(
        'security.authenticate',
        { some: 'some', headers: { one: '1' } },
        { wrap401Errors: true }
      )
    ).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some', headers: { one: '1' } },
      { wrap401Errors: true }
    );

    expect(internalAPICaller).not.toHaveBeenCalled();
  });

  test('callAsCurrentUser allows passing additional headers', async () => {
    const mockResponse = { data: 'response' };
    scopedAPICaller.mockResolvedValue(mockResponse);
    await expect(
      clusterClient.callAsCurrentUser('security.authenticate', {
        some: 'some',
        headers: { additionalHeader: 'Oh Yes!' },
      })
    ).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some', headers: { one: '1', additionalHeader: 'Oh Yes!' } },
      undefined
    );
  });

  test('callAsCurrentUser cannot override default headers', async () => {
    const expectedErrorResponse = new Error('Cannot override default header one.');
    const withHeaderOverride = async () =>
      clusterClient.callAsCurrentUser('security.authenticate', { headers: { one: 'OVERRIDE' } });
    await expect(withHeaderOverride()).rejects.toThrowError(expectedErrorResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(0);
  });

  test('properly forwards errors returned by the API caller', async () => {
    const mockErrorResponse = new Error('some-error');
    scopedAPICaller.mockRejectedValue(mockErrorResponse);

    await expect(clusterClient.callAsCurrentUser('ping')).rejects.toBe(mockErrorResponse);

    expect(internalAPICaller).not.toHaveBeenCalled();
  });

  test('does not attach headers to the client params if they are not available', async () => {
    const mockResponse = { data: 'response' };
    scopedAPICaller.mockResolvedValue(mockResponse);

    const clusterClientWithoutHeaders = new ScopedClusterClient(internalAPICaller, scopedAPICaller);

    await expect(clusterClientWithoutHeaders.callAsCurrentUser('ping')).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith('ping', {}, undefined);
    scopedAPICaller.mockClear();

    await expect(
      clusterClientWithoutHeaders.callAsCurrentUser('security.authenticate', { some: 'some' })
    ).resolves.toBe(mockResponse);
    expect(scopedAPICaller).toHaveBeenCalledTimes(1);
    expect(scopedAPICaller).toHaveBeenCalledWith(
      'security.authenticate',
      { some: 'some' },
      undefined
    );

    expect(internalAPICaller).not.toHaveBeenCalled();
  });
});
