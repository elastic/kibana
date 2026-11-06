/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { APMClientV2 } from '@kbn/apm-api-shared';
import { createCallApmApiV2 } from '@kbn/apm-api-shared';
import { ApmSharedPlugin } from './plugin';
import {
  OBSERVABILITY_APM_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
} from '.';

jest.mock('@kbn/apm-api-shared', () => ({
  createCallApmApiV2: jest.fn(),
}));

const createCallApmApiV2Mock = createCallApmApiV2 as jest.MockedFunction<typeof createCallApmApiV2>;

describe('ApmSharedPlugin', () => {
  const startPlugin = (isCpsEnabled$: BehaviorSubject<boolean>) => {
    const core = coreMock.createStart();
    core.featureFlags.getBooleanValue$.mockReturnValue(isCpsEnabled$);

    const cps = cpsPluginMock.createStartContract();
    const plugin = new ApmSharedPlugin();
    const { callApmApi } = plugin.start(core, { cps });

    // The client is only typed for known endpoints; the tests assert on how it is built, not on the call itself.
    const callAnyEndpoint = callApmApi as unknown as (
      endpoint: string,
      options: Record<string, unknown>
    ) => Promise<unknown>;

    return { core, cps, plugin, callAnyEndpoint };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createCallApmApiV2Mock.mockReturnValue(jest.fn() as unknown as APMClientV2);
  });

  it('observes the CPS feature flag with the shared default as fallback', () => {
    const { core } = startPlugin(new BehaviorSubject(true));

    expect(core.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
      OBSERVABILITY_APM_CPS_ENABLED_DEFAULT
    );
  });

  it('builds the API client with the CPS manager when the flag is enabled', async () => {
    const { core, cps, callAnyEndpoint } = startPlugin(new BehaviorSubject(true));

    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});

    expect(createCallApmApiV2Mock).toHaveBeenCalledWith(core, { cpsManager: cps.cpsManager });
  });

  it('builds the API client without the CPS manager when the flag is disabled', async () => {
    const { core, callAnyEndpoint } = startPlugin(new BehaviorSubject(false));

    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});

    expect(createCallApmApiV2Mock).toHaveBeenCalledWith(core, { cpsManager: undefined });
  });

  it('picks up flag values emitted after start', async () => {
    const isCpsEnabled$ = new BehaviorSubject(false);
    const { core, cps, callAnyEndpoint } = startPlugin(isCpsEnabled$);

    isCpsEnabled$.next(true);
    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});

    expect(createCallApmApiV2Mock).toHaveBeenCalledWith(core, { cpsManager: cps.cpsManager });
  });

  it('reuses the client while the flag is unchanged', async () => {
    const { callAnyEndpoint } = startPlugin(new BehaviorSubject(true));

    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});
    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});

    expect(createCallApmApiV2Mock).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the client when the flag changes after it was built', async () => {
    const isCpsEnabled$ = new BehaviorSubject(true);
    const { core, callAnyEndpoint } = startPlugin(isCpsEnabled$);

    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});
    isCpsEnabled$.next(false);
    await callAnyEndpoint('GET /internal/apm/traces/{traceId}', {});

    expect(createCallApmApiV2Mock).toHaveBeenCalledTimes(2);
    expect(createCallApmApiV2Mock).toHaveBeenLastCalledWith(core, { cpsManager: undefined });
  });

  it('stops observing the flag on stop', async () => {
    const isCpsEnabled$ = new BehaviorSubject(true);
    const { plugin } = startPlugin(isCpsEnabled$);

    expect(isCpsEnabled$.observed).toBe(true);

    plugin.stop();

    expect(isCpsEnabled$.observed).toBe(false);
  });
});
