/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createKibanaOfrepProvider } from './kibana_ofrep_provider';

jest.mock('@openfeature/ofrep-web-provider', () => ({
  OFREPWebProvider: jest.fn(),
}));

function installedProvider(http: HttpSetup) {
  createKibanaOfrepProvider({
    http,
    initialFlags: {},
    logger: { warn: jest.fn() },
  });
  const options = jest.mocked(OFREPWebProvider).mock.calls.at(-1)?.[0];
  if (!options) {
    throw new Error('Expected the OFREP provider to be constructed');
  }
  const fetchImplementation = options.fetchImplementation;
  if (!fetchImplementation) {
    throw new Error('Expected the OFREP provider to use Kibana fetch');
  }
  return fetchImplementation;
}

describe('createKibanaOfrepProvider', () => {
  const requestUrl = () =>
    new Request(`${window.location.origin}/kbn/internal/feature-flags/ofrep/v1/evaluate/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'If-None-Match': '"etag"',
      },
      body: '{"context":{}}',
    });

  test('sends the OFREP request through the Kibana HTTP client', async () => {
    const http = httpServiceMock.createSetupContract({ basePath: '/kbn' });
    const response = new Response(JSON.stringify({ flags: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    jest.mocked(http.fetch).mockResolvedValue({ response });

    const result = await installedProvider(http)(requestUrl(), {});

    expect(result).toBe(response);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/feature-flags/ofrep/v1/evaluate/flags',
      expect.objectContaining({
        method: 'POST',
        body: '{"context":{}}',
        asSystemRequest: true,
        asResponse: true,
        rawResponse: true,
        headers: { 'if-none-match': '"etag"' },
      })
    );
  });

  test('returns the response when Kibana fetch throws for an unchanged snapshot', async () => {
    const http = httpServiceMock.createSetupContract({ basePath: '/kbn' });
    const notModified = new Response(null, { status: 304, headers: { etag: '"etag"' } });
    jest
      .mocked(http.fetch)
      .mockRejectedValue(Object.assign(new Error('Not Modified'), { response: notModified }));

    await expect(installedProvider(http)(requestUrl(), {})).resolves.toBe(notModified);
  });

  test('rethrows a transport failure', async () => {
    const http = httpServiceMock.createSetupContract({ basePath: '/kbn' });
    jest.mocked(http.fetch).mockRejectedValue(new Error('offline'));

    await expect(installedProvider(http)(requestUrl(), {})).rejects.toThrow('offline');
  });
});
