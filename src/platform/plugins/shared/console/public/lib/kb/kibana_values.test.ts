/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { KibanaValuesProvider } from './kibana_values';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('KibanaValuesProvider', () => {
  let get: jest.Mock;
  let now: number;
  let provider: KibanaValuesProvider;

  beforeEach(() => {
    get = jest
      .fn()
      .mockResolvedValue([
        { id: 'default', name: 'Default' },
        { id: 'marketing' },
        { name: 'no id' },
      ]);
    now = 1000;
    provider = new KibanaValuesProvider({ get } as unknown as HttpSetup, () => now);
  });

  it('is empty until the values are loaded, then returns the resource ids', async () => {
    expect(provider.getTerms('space')).toStrictEqual([]);

    await flushPromises();

    expect(provider.getTerms('space')).toStrictEqual([
      { name: 'default', meta: 'Default' },
      { name: 'marketing' },
    ]);
    expect(get).toHaveBeenCalledWith('/api/spaces/space', expect.any(Object));
  });

  it('reads the resources from the wrapper of the data views and rules responses', async () => {
    get.mockImplementation(async (path: string) =>
      path === '/api/data_views'
        ? { data_view: [{ id: 'logs', name: 'Logs' }] }
        : { data: [{ id: 'rule-1', name: 'My rule' }] }
    );

    provider.prefetch();
    await flushPromises();

    expect(provider.getTerms('data_view')).toStrictEqual([{ name: 'logs', meta: 'Logs' }]);
    expect(provider.getTerms('rule')).toStrictEqual([{ name: 'rule-1', meta: 'My rule' }]);
    expect(get).toHaveBeenCalledWith(
      '/api/data_views',
      expect.objectContaining({ version: '2023-10-31' })
    );
  });

  it('only requests a source again once the refresh interval has passed', async () => {
    provider.getTerms('space');
    provider.getTerms('space');
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);

    now += 31000;
    provider.getTerms('space');

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('keeps the values loaded before when a refresh fails', async () => {
    provider.getTerms('space');
    await flushPromises();
    get.mockRejectedValue(new Error('forbidden'));

    now += 31000;
    provider.getTerms('space');
    await flushPromises();

    expect(provider.getTerms('space')).toHaveLength(2);
  });

  it('stays empty when the request fails', async () => {
    get.mockRejectedValue(new Error('forbidden'));

    provider.getTerms('connector');
    await flushPromises();

    expect(provider.getTerms('connector')).toStrictEqual([]);
  });
});
