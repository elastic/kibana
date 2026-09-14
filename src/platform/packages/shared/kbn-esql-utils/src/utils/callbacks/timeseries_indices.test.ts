/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { getTimeseriesIndices } from './timeseries_indices';

const mockResult = { indices: [{ name: 'my_ts_index', mode: 'time_series', aliases: [] }] };

const createHttp = () => ({ get: jest.fn().mockResolvedValue(mockResult) } as unknown as HttpStart);

describe('getTimeseriesIndices', () => {
  it('calls the correct route', async () => {
    const http = createHttp();
    await getTimeseriesIndices(http);
    expect(http.get).toHaveBeenCalledWith(
      TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE,
      expect.any(Object)
    );
  });

  it('does not include projectRouting when not provided', async () => {
    const http = createHttp();
    await getTimeseriesIndices(http);
    const callArgs = (http.get as jest.Mock).mock.calls[0][1];
    expect(callArgs.query).toBeUndefined();
  });

  it('includes projectRouting when provided', async () => {
    const http = createHttp();
    await getTimeseriesIndices(http, '_alias:*');
    const { query } = (http.get as jest.Mock).mock.calls[0][1];
    expect(query.projectRouting).toBe('_alias:*');
  });

  it('passes signal to the HTTP call', async () => {
    const http = createHttp();
    const controller = new AbortController();
    await getTimeseriesIndices(http, undefined, controller.signal);
    const callArgs = (http.get as jest.Mock).mock.calls[0][1];
    expect(callArgs.signal).toBe(controller.signal);
  });

  it('returns the server response', async () => {
    const http = createHttp();
    const result = await getTimeseriesIndices(http);
    expect(result).toEqual(mockResult);
  });
});
