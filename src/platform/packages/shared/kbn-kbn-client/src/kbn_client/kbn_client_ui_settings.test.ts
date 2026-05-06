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
  it('refreshes uiSettings cache via the direct bypass route when available', async () => {
    const { requester, uiSettings } = createUiSettingsClient();

    await expect(uiSettings.refresh({ space: 'observability' })).resolves.toBe('direct_bypass');

    expect(requester.request).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'refresh uiSettings cache via direct bypass',
        path: '/s/observability/internal/ftr/ui_settings/_refresh',
        method: 'POST',
        ignoreErrors: [404],
      })
    );
  });

  it('falls back to the core app route when the bypass route is unavailable', async () => {
    const { requester, uiSettings } = createUiSettingsClient();

    requester.request
      .mockResolvedValueOnce(createAxiosResponse({ refreshed: false }, 404))
      .mockResolvedValueOnce(createAxiosResponse('ok'));

    await expect(uiSettings.refresh({ space: 'observability' })).resolves.toBe('core_app_render');

    expect(requester.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        description: 'refresh uiSettings cache via direct bypass',
        path: '/s/observability/internal/ftr/ui_settings/_refresh',
        method: 'POST',
      })
    );
    expect(requester.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        description: 'refresh uiSettings cache via core app',
        path: '/s/observability/app/home',
        method: 'GET',
      })
    );
  });

  it('retries the probe and refreshes cache after a failure', async () => {
    const { requester, uiSettings } = createUiSettingsClient();
    const probe = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('stale value'))
      .mockResolvedValueOnce('updated');

    await expect(
      uiSettings.waitForPropagation({
        probe,
        description: 'consumer behavior',
        retryIntervalMs: 0,
        timeoutMs: 1_000,
      })
    ).resolves.toBe('updated');

    expect(probe).toHaveBeenCalledTimes(2);
    expect(requester.request).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'refresh uiSettings cache via direct bypass',
        path: '/internal/ftr/ui_settings/_refresh',
        method: 'POST',
      })
    );
  });

  it('updates settings before waiting for propagation', async () => {
    const { requester, uiSettings } = createUiSettingsClient();
    const probe = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('stale value'))
      .mockResolvedValueOnce(undefined);

    await uiSettings.updateAndWait(
      {
        'observability:enableInfrastructureAssetCustomDashboards': true,
      },
      {
        probe,
        retryIntervalMs: 0,
        timeoutMs: 1_000,
      }
    );

    expect(requester.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/internal/kibana/settings',
        method: 'POST',
        body: {
          changes: {
            'observability:enableInfrastructureAssetCustomDashboards': true,
          },
        },
        retries: 3,
      })
    );
  });
});
