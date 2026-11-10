/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { fetchKibanaVersionHeaderString } from './fetch_kibana_version';

const mockedFetch = jest.spyOn(global, 'fetch');

describe('fetchKibanaVersionHeaderString', () => {
  const log = new ToolingLog();

  // Every attempt after the first is gated behind a linear backoff, so the retry tests below drive
  // the timers forward instead of waiting out the real 1s + 2s + 3s + 4s.
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns version.number and appends -SNAPSHOT when build_snapshot is true', async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ version: { number: '9.0.0', build_snapshot: true } }), {
        status: 200,
      })
    );

    const v = await fetchKibanaVersionHeaderString(
      'https://localhost:5601',
      'elastic',
      'changeme',
      log
    );

    expect(v).toBe('9.0.0-SNAPSHOT');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = mockedFetch.mock.calls[0];
    expect(callInit?.method).toBe('GET');
    const expectedAuth = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
    expect((callInit?.headers as Record<string, string>).Authorization).toBe(expectedAuth);
    const callUrlString = callUrl instanceof URL ? callUrl.toString() : String(callUrl);
    expect(callUrlString).toContain('/api/status');
    expect(callUrlString).toContain('v8format=true');
  });

  test('throws when version is missing from response body', async () => {
    // A Response body can only be read once, so each attempt needs its own instance.
    mockedFetch.mockImplementation(async () => new Response('{}', { status: 200 }));

    const settled = fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log).catch(
      (error) => error
    );
    await jest.advanceTimersByTimeAsync(10_000);

    expect(await settled).toHaveProperty(
      'message',
      expect.stringMatching(/Unable to get version from Kibana/)
    );
  });

  test('retries a network-level failure and resolves once a later attempt succeeds', async () => {
    mockedFetch.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(
      new Response(JSON.stringify({ version: { number: '9.0.0', build_snapshot: false } }), {
        status: 200,
      })
    );

    const promise = fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log);
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toBe('9.0.0');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  test('propagates the fetch error once every attempt fails', async () => {
    mockedFetch.mockRejectedValue(new TypeError('network down'));

    const settled = fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log).catch(
      (error) => error
    );
    await jest.advanceTimersByTimeAsync(10_000);

    expect(await settled).toHaveProperty('message', 'network down');
    expect(mockedFetch).toHaveBeenCalledTimes(5);
  });
});
