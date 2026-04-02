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

const fetchMock = jest.spyOn(global, 'fetch');

describe('fetchKibanaVersionHeaderString', () => {
  const log = new ToolingLog();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns version.number and appends -SNAPSHOT when build_snapshot is true', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        version: { number: '9.0.0', build_snapshot: true },
      }),
    } as unknown as Response);

    const v = await fetchKibanaVersionHeaderString(
      'https://localhost:5601',
      'elastic',
      'changeme',
      log
    );

    expect(v).toBe('9.0.0-SNAPSHOT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = fetchMock.mock.calls[0];
    expect(callUrl).toContain('/api/status');
    expect(callUrl).toContain('v8format=true');
    expect(callOptions).toEqual(
      expect.objectContaining({
        method: 'GET',
      })
    );
    const headers = callOptions?.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  test('throws when version is missing from response body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow(/Unable to get version from Kibana/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('propagates fetch errors after a single attempt', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow('network down');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
