/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { ToolingLog } from '@kbn/tooling-log';
import { fetchKibanaVersionHeaderString } from './fetch_kibana_version';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchKibanaVersionHeaderString', () => {
  const log = new ToolingLog();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns version.number and appends -SNAPSHOT when build_snapshot is true', async () => {
    mockedAxios.request.mockResolvedValue({
      data: {
        version: { number: '9.0.0', build_snapshot: true },
      },
    });

    const v = await fetchKibanaVersionHeaderString(
      'https://localhost:5601',
      'elastic',
      'changeme',
      log
    );

    expect(v).toBe('9.0.0-SNAPSHOT');
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        auth: { username: 'elastic', password: 'changeme' },
        validateStatus: expect.any(Function),
      })
    );
    const callUrl = mockedAxios.request.mock.calls[0][0].url as string;
    expect(callUrl).toContain('/api/status');
    expect(callUrl).toContain('v8format=true');
  });

  test('throws when version is missing from response body', async () => {
    mockedAxios.request.mockResolvedValue({ data: {} });

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow(/Unable to get version from Kibana/);

    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  test('propagates axios errors after a single attempt', async () => {
    mockedAxios.request.mockRejectedValue(new Error('network down'));

    await expect(
      fetchKibanaVersionHeaderString('http://localhost:5601', 'u', 'p', log)
    ).rejects.toThrow('network down');

    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });
});
