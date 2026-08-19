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

  beforeEach(() => {
    jest.resetAllMocks();
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
    mockedFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow(/Unable to get version from Kibana/);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  test('propagates fetch errors after a single attempt', async () => {
    mockedFetch.mockRejectedValue(new Error('network down'));

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow('network down');

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
