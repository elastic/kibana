/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientRequester } from './kbn_client_requester';
import { KbnClientUiSettings } from './kbn_client_ui_settings';

const createAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> =>
  ({
    data,
    status,
  } as AxiosResponse<T>);

const createUiSettingsClient = () => {
  const requester = {
    request: jest.fn().mockResolvedValue(createAxiosResponse({})),
  } as unknown as jest.Mocked<KbnClientRequester>;

  const log = {
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as ToolingLog;

  return {
    requester,
    uiSettings: new KbnClientUiSettings(log, requester),
  };
};

describe('KbnClientUiSettings', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries the assertion until it succeeds', async () => {
    const { requester, uiSettings } = createUiSettingsClient();
    const assertion = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('stale value'))
      .mockResolvedValueOnce('updated');

    await expect(
      uiSettings.withPropagationDelay({
        assertion,
        description: 'consumer behavior',
        retryIntervalMs: 0,
        timeoutMs: 1_000,
      })
    ).resolves.toBe('updated');

    expect(assertion).toHaveBeenCalledTimes(2);
    expect(requester.request).not.toHaveBeenCalled();
  });

  it('waits for the full propagation window when no assertion is provided', async () => {
    jest.useFakeTimers();

    const { requester, uiSettings } = createUiSettingsClient();
    const wait = uiSettings.withPropagationDelay({ timeoutMs: 10 });

    await jest.advanceTimersByTimeAsync(10);

    await expect(wait).resolves.toBeUndefined();
    expect(requester.request).not.toHaveBeenCalled();
  });

  it('surfaces the last assertion error when propagation times out', async () => {
    const { uiSettings } = createUiSettingsClient();
    const assertion = jest.fn<Promise<void>, []>().mockRejectedValue(new Error('still stale'));

    await expect(
      uiSettings.withPropagationDelay({
        assertion,
        description: 'custom dashboards',
        retryIntervalMs: 0,
        timeoutMs: 0,
      })
    ).rejects.toThrow('Timed out waiting for custom dashboards: still stale');
  });
});
