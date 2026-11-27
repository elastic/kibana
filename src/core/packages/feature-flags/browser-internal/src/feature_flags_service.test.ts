/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import { firstValueFrom } from 'rxjs';
import { act, renderHook } from '@testing-library/react';
import { apm } from '@elastic/apm-rum';
import {
  type Client,
  ClientProviderEvents,
  type EvaluationDetails,
  OpenFeature,
  type Provider,
  StandardResolutionReasons,
} from '@openfeature/web-sdk';
import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import { FeatureFlagsService } from '..';
import { mountFeatureFlagsHelper } from './helper';

const cachedDetails = <T extends boolean | string | number>(
  value: T,
  reason: string = StandardResolutionReasons.CACHED
): EvaluationDetails<T> => ({ flagKey: 'my-flag', flagMetadata: {}, value, reason });

jest.mock('@openfeature/ofrep-web-provider', () => ({
  OFREPWebProvider: jest.fn(),
}));

jest.mock('./helper', () => ({
  mountFeatureFlagsHelper: jest.fn(() => ({
    unmount: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
    setCornerButtonVisible: jest.fn(),
  })),
}));

/** Dynamic `import()` settles across more than one microtask. */
async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
}

async function isSettledPromise(p: Promise<unknown>) {
  const immediateValue = {};
  const result = await Promise.race([p, immediateValue]);
  return result !== immediateValue;
}

describe('FeatureFlagsService Browser', () => {
  let featureFlagsService: FeatureFlagsService;
  let featureFlagsClient: Client;
  let injectedMetadata: jest.Mocked<InternalInjectedMetadataSetup>;
  let http: HttpSetupMock;

  const createSetupDeps = () => ({ http, injectedMetadata });

  beforeEach(() => {
    const getClientSpy = jest.spyOn(OpenFeature, 'getClient');
    featureFlagsService = new FeatureFlagsService(coreContextMock.create());
    featureFlagsClient = getClientSpy.mock.results[0].value;
    injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    http = httpServiceMock.createSetupContract();
    http.post.mockResolvedValue(undefined);
    jest.spyOn(OpenFeature, 'setProviderAndWait').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await featureFlagsService.stop();
    jest.clearAllMocks();
    await OpenFeature.clearProviders();
    await OpenFeature.clearContexts();
  });

  describe('provider handling', () => {
    const openFeatureLogger = { error() {}, warn() {}, info() {}, debug() {} };

    test('installs the Kibana OFREP provider during setup', () => {
      http = httpServiceMock.createSetupContract({ basePath: '/kbn' });
      injectedMetadata.getFeatureFlags.mockReturnValue({
        overrides: {
          'my-overridden-flag': true,
          myDestructuredObjPlugin: { myOverriddenFlag: true },
        },
        initialFeatureFlags: { 'my-initial-flag': false, 'my-overridden-flag': false },
      });
      const addHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');

      featureFlagsService.setup(createSetupDeps());

      expect(OFREPWebProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: `${window.location.origin}/kbn/internal/feature-flags`,
          pollInterval: 10_000,
          changeDetection: 'polling',
          fetchImplementation: expect.any(Function),
        })
      );
      const provider = jest.mocked(OpenFeature.setProviderAndWait).mock
        .calls[0][0] as unknown as Provider;
      expect(provider.metadata).toEqual({ name: 'Kibana OFREP provider' });
      expect(
        provider.resolveBooleanEvaluation('my-initial-flag', true, {}, openFeatureLogger)
      ).toEqual({ value: false, reason: 'CACHED' });
      expect(
        provider.resolveBooleanEvaluation('my-overridden-flag', false, {}, openFeatureLogger)
      ).toEqual({ value: true, reason: 'CACHED' });
      expect(
        provider.resolveBooleanEvaluation(
          'myDestructuredObjPlugin.myOverriddenFlag',
          false,
          {},
          openFeatureLogger
        )
      ).toEqual({ value: true, reason: 'CACHED' });
      expect(addHandlerSpy).toHaveBeenCalledWith(ClientProviderEvents.Ready, expect.any(Function));
    });

    test('awaits initialization in the start context', async () => {
      let externalResolve: Function = () => void 0;
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          externalResolve = resolve;
        });
      });
      featureFlagsService.setup(createSetupDeps());
      const startPromise = featureFlagsService.start();
      await expect(isSettledPromise(startPromise)).resolves.toBe(false);
      externalResolve();
      await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise resolution to spread
      await expect(isSettledPromise(startPromise)).resolves.toBe(true);
    });

    test('continues startup when the provider fails to initialize', async () => {
      const coreContext = coreContextMock.create();
      const service = new FeatureFlagsService(coreContext);
      jest
        .spyOn(OpenFeature, 'setProviderAndWait')
        .mockRejectedValueOnce(new Error('provider down'));
      service.setup(createSetupDeps());

      await expect(service.start()).resolves.toEqual(expect.any(Object));
      expect(coreContext.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('provider down')
      );

      await service.stop();
    });

    test('do not hold for too long during initialization', async () => {
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementationOnce(async () => {
        await new Promise(() => {}); // never resolves
      });
      const addLabelsMock = jest.fn();
      jest
        .spyOn(apm, 'getCurrentTransaction')
        // @ts-expect-error incomplete signature, but we don't care at this point
        .mockImplementationOnce(() => ({ addLabels: addLabelsMock }));
      featureFlagsService.setup(createSetupDeps());
      const startPromise = featureFlagsService.start();
      await expect(isSettledPromise(startPromise)).resolves.toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 2100)); // A bit longer than 2 seconds
      await expect(isSettledPromise(startPromise)).resolves.toBe(true);
      expect(addLabelsMock).toHaveBeenCalledWith({ slow_setup: true });
    });

    describe('APM instrumentation', () => {
      test('starts an APM transaction to track provider initialization', () => {
        const apmSpy = jest.spyOn(apm, 'startTransaction');
        featureFlagsService.setup(createSetupDeps());
        expect(apmSpy).toHaveBeenCalledWith('set-provider', 'feature-flags');
      });

      test('APM transaction tracks success', async () => {
        const apmSpy = jest.spyOn(apm, 'startTransaction');
        featureFlagsService.setup(createSetupDeps());

        const transaction = apmSpy.mock.results[0].value;
        const endTransactionSpy = jest.spyOn(transaction, 'end');
        await jest.mocked(OpenFeature.setProviderAndWait).mock.results[0].value;
        await new Promise((resolve) => process.nextTick(resolve));
        expect(transaction.outcome).toBe('success');
        expect(endTransactionSpy).toHaveBeenCalledTimes(1);
      });

      test('APM transaction tracks failures', async () => {
        const apmSpy = jest.spyOn(apm, 'startTransaction');
        const apmCaptureErrorSpy = jest.spyOn(apm, 'captureError');
        const error = new Error('Something went terribly wrong');
        jest.spyOn(OpenFeature, 'setProviderAndWait').mockRejectedValueOnce(error);
        featureFlagsService.setup(createSetupDeps());

        const transaction = apmSpy.mock.results[0].value;
        const endTransactionSpy = jest.spyOn(transaction, 'end');
        await jest.mocked(OpenFeature.setProviderAndWait).mock.results[0].value.catch(() => {});
        expect(apmCaptureErrorSpy).toHaveBeenCalledWith(error);
        expect(transaction.outcome).toBe('failure');
        expect(endTransactionSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('context handling', () => {
    let setContextSpy: jest.SpyInstance;

    beforeEach(() => {
      setContextSpy = jest.spyOn(OpenFeature, 'setContext');
    });

    test('appends context to the provider', async () => {
      const { appendContext } = featureFlagsService.setup(createSetupDeps());
      await appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('appends context to the provider (start method)', async () => {
      featureFlagsService.setup(createSetupDeps());
      const { appendContext } = await featureFlagsService.start();
      await appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('full multi context pass-through', async () => {
      const { appendContext } = featureFlagsService.setup(createSetupDeps());
      const context = {
        kind: 'multi' as const,
        kibana: {
          key: 'kibana-1',
        },
        organization: {
          key: 'organization-1',
        },
      };
      await appendContext(context);
      expect(setContextSpy).toHaveBeenCalledWith(context);
    });

    test('appends to the existing context', async () => {
      const { appendContext } = featureFlagsService.setup(createSetupDeps());
      const initialContext = {
        kind: 'multi' as const,
        kibana: {
          key: 'kibana-1',
        },
        organization: {
          key: 'organization-1',
        },
      };
      await appendContext(initialContext);
      expect(setContextSpy).toHaveBeenCalledWith(initialContext);

      await appendContext({ kind: 'multi', kibana: { has_data: true } });
      expect(setContextSpy).toHaveBeenCalledWith({
        ...initialContext,
        kibana: {
          ...initialContext.kibana,
          has_data: true,
        },
      });
    });

    test('converts single-contexts to multi-context', async () => {
      const { appendContext } = featureFlagsService.setup(createSetupDeps());
      await appendContext({ kind: 'organization', key: 'organization-1' });
      expect(setContextSpy).toHaveBeenCalledWith({
        kind: 'multi',
        organization: {
          key: 'organization-1',
        },
      });
    });

    test('if no `kind` provided, it defaults to the kibana context', async () => {
      const { appendContext } = featureFlagsService.setup(createSetupDeps());
      await appendContext({ key: 'key-1', has_data: false });
      expect(setContextSpy).toHaveBeenCalledWith({
        kind: 'multi',
        kibana: {
          key: 'key-1',
          has_data: false,
        },
      });
    });
  });

  describe('flag evaluation', () => {
    let startContract: FeatureFlagsStart;
    let apmSpy: jest.SpyInstance;
    let addHandlerSpy: jest.SpyInstance;

    beforeEach(async () => {
      addHandlerSpy = jest.spyOn(featureFlagsClient, 'addHandler');
      featureFlagsService.setup(createSetupDeps());
      startContract = await featureFlagsService.start();
      apmSpy = jest.spyOn(apm, 'addLabels');
    });

    test('getBooleanValue$ delivers the current evaluation before subscribe returns', () => {
      jest.spyOn(featureFlagsClient, 'getBooleanDetails').mockReturnValue(cachedDetails(true));

      let value: boolean | undefined;
      startContract
        .getBooleanValue$('my-flag', false)
        .subscribe((next) => {
          value = next;
        })
        .unsubscribe();

      // Unsubscribing in the same turn drops a later emission, so this stays
      // undefined unless the current value was delivered synchronously.
      expect(value).toBe(true);

      jest.spyOn(featureFlagsClient, 'getBooleanDetails').mockReturnValue(cachedDetails(false));
      value = undefined;
      startContract
        .getBooleanValue$('my-flag', true)
        .subscribe((next) => {
          value = next;
        })
        .unsubscribe();

      expect(value).toBe(false);
    });

    test('observe a boolean flag', async () => {
      const value = false;
      const flag$ = startContract.getBooleanValue$('my-flag', value);
      const observedValues: boolean[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
      expect(observedValues).toHaveLength(1);

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(1); // still 1

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(2);

      // Reevaluates and emits when the context is changed
      await startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(3);
    });

    test('useBooleanValue seeds from the synchronous evaluation and updates when the flag changes', () => {
      jest.spyOn(featureFlagsClient, 'getBooleanDetails').mockReturnValue(cachedDetails(true));

      const { result } = renderHook(() => startContract.useBooleanValue('my-flag', false));

      expect(result.current).toBe(true);

      jest.mocked(featureFlagsClient.getBooleanDetails).mockReturnValue(cachedDetails(false));
      act(() => {
        addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      });

      expect(result.current).toBe(false);
    });

    test('useBooleanValue uses the synchronous evaluation when the flag or fallback changes', () => {
      jest
        .spyOn(featureFlagsClient, 'getBooleanDetails')
        .mockImplementation((flagName: string, fallback: boolean) =>
          cachedDetails(flagName === 'my-flag' ? false : fallback)
        );

      const seen: boolean[] = [];
      const { rerender } = renderHook(
        ({ flagName, fallback }: { flagName: string; fallback: boolean }) => {
          const value = startContract.useBooleanValue(flagName, fallback);
          seen.push(value);
          return value;
        },
        { initialProps: { flagName: 'my-flag', fallback: false } }
      );

      expect(seen).toEqual([false]);

      rerender({ flagName: 'other-flag', fallback: true });
      expect(seen).toEqual([false, true]);

      rerender({ flagName: 'other-flag', fallback: false });
      expect(seen).toEqual([false, true, false]);
    });

    test('useStringValue seeds from the synchronous evaluation and updates when the flag changes', () => {
      jest.spyOn(featureFlagsClient, 'getStringDetails').mockReturnValue(cachedDetails('live'));

      const { result } = renderHook(() => startContract.useStringValue('my-flag', 'fallback'));

      expect(result.current).toBe('live');

      jest.mocked(featureFlagsClient.getStringDetails).mockReturnValue(cachedDetails('updated'));
      act(() => {
        addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      });

      expect(result.current).toBe('updated');
    });

    test('useNumberValue seeds from the synchronous evaluation and updates when the flag changes', () => {
      jest.spyOn(featureFlagsClient, 'getNumberDetails').mockReturnValue(cachedDetails(2));

      const { result } = renderHook(() => startContract.useNumberValue('my-flag', 1));

      expect(result.current).toBe(2);

      jest.mocked(featureFlagsClient.getNumberDetails).mockReturnValue(cachedDetails(3));
      act(() => {
        addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      });

      expect(result.current).toBe(3);
    });

    test('observe a string flag', async () => {
      const value = 'my-value';
      const flag$ = startContract.getStringValue$('my-flag', value);
      const observedValues: string[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
      expect(observedValues).toHaveLength(1);

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(1); // still 1

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(2);

      // Reevaluates and emits when the context is changed
      await startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(3);
    });

    test('observe a number flag', async () => {
      const value = 42;
      const flag$ = startContract.getNumberValue$('my-flag', value);
      const observedValues: number[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
      expect(observedValues).toHaveLength(1);

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(1); // still 1

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(2);

      // Reevaluates and emits when the context is changed
      await startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(3);
    });

    describe('usage counter reporting', () => {
      test('does not report repeated evaluations of the same value', async () => {
        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));
        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));
        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'No-op' }),
        });
      });

      test('does not retry the same value after a failed best-effort report', async () => {
        http.post.mockRejectedValueOnce(new Error('Counter request failed'));

        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));
        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'No-op' }),
        });
      });

      test('does not report repeated NaN evaluations', async () => {
        await firstValueFrom(startContract.getNumberValue$('my-flag', NaN));
        await firstValueFrom(startContract.getNumberValue$('my-flag', NaN));

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: NaN, reason: 'No-op' }),
        });
      });

      test('reports again when the evaluated value changes', async () => {
        const getBooleanDetailsSpy = jest.spyOn(featureFlagsClient, 'getBooleanDetails');
        getBooleanDetailsSpy
          .mockReturnValueOnce(cachedDetails(true))
          .mockReturnValueOnce(cachedDetails(false));

        await expect(
          firstValueFrom(startContract.getBooleanValue$('my-flag', false))
        ).resolves.toEqual(true);
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenLastCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: true, reason: 'CACHED' }),
        });

        await expect(
          firstValueFrom(startContract.getBooleanValue$('my-flag', false))
        ).resolves.toEqual(false);
        expect(http.post).toHaveBeenCalledTimes(2);
        expect(http.post).toHaveBeenLastCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'CACHED' }),
        });
      });

      test('reports again when only the evaluation reason changes', async () => {
        jest
          .spyOn(featureFlagsClient, 'getBooleanDetails')
          .mockReturnValueOnce(cachedDetails(false, StandardResolutionReasons.ERROR))
          .mockReturnValueOnce(cachedDetails(false));

        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));
        await firstValueFrom(startContract.getBooleanValue$('my-flag', false));

        expect(http.post).toHaveBeenCalledTimes(2);
        expect(http.post).toHaveBeenNthCalledWith(1, '/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'ERROR' }),
        });
        expect(http.post).toHaveBeenNthCalledWith(2, '/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'CACHED' }),
        });
      });

      test('treats values of different types as distinct for the same flag name', async () => {
        await firstValueFrom(startContract.getStringValue$('my-flag', '1'));
        await firstValueFrom(startContract.getNumberValue$('my-flag', 1));

        expect(http.post).toHaveBeenCalledTimes(2);
        expect(http.post).toHaveBeenNthCalledWith(1, '/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: '1', reason: 'No-op' }),
        });
        expect(http.post).toHaveBeenNthCalledWith(2, '/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: 1, reason: 'No-op' }),
        });
      });

      test('observable does not report again when reevaluated value is unchanged', () => {
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        const subscription = flag$.subscribe();
        expect(http.post).toHaveBeenCalledTimes(1);

        addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });

        expect(http.post).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
      });

      test('observable reports again when the evaluated value changes', () => {
        const getBooleanDetailsSpy = jest.spyOn(featureFlagsClient, 'getBooleanDetails');
        getBooleanDetailsSpy.mockReturnValue(cachedDetails(true));

        const flag$ = startContract.getBooleanValue$('my-flag', false);
        const subscription = flag$.subscribe();
        expect(http.post).toHaveBeenCalledTimes(1);

        getBooleanDetailsSpy.mockReturnValue(cachedDetails(false));
        addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });

        expect(http.post).toHaveBeenCalledTimes(2);
        expect(http.post).toHaveBeenLastCalledWith('/internal/feature-flags/my-flag/counter', {
          body: JSON.stringify({ value: false, reason: 'CACHED' }),
        });
        subscription.unsubscribe();
      });
    });

    test('reevaluates subscribed flags when the provider becomes ready', async () => {
      const openFeatureAddHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
      featureFlagsService.setup(createSetupDeps());

      const getBooleanDetailsSpy = jest.spyOn(featureFlagsClient, 'getBooleanDetails');
      getBooleanDetailsSpy.mockReturnValue(cachedDetails(false));

      const observedValues: boolean[] = [];
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe((v) => observedValues.push(v));
      await expect(firstValueFrom(flag$)).resolves.toEqual(false);
      expect(observedValues).toEqual([false]);

      const readyHandler = openFeatureAddHandlerSpy.mock.calls.find(
        ([event]) => event === ClientProviderEvents.Ready
      )?.[1];
      expect(readyHandler).toBeDefined();

      getBooleanDetailsSpy.mockReturnValue(cachedDetails(true));
      await readyHandler!();
      expect(observedValues).toEqual([false, true]);

      openFeatureAddHandlerSpy.mockRestore();
    });

    test('records evaluations for the helper', async () => {
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe(() => {});
      await expect(firstValueFrom(flag$)).resolves.toEqual(false);

      expect(featureFlagsService.getEvaluatedFlags()).toEqual([{ key: 'my-flag', value: false }]);
    });
  });

  describe('helper registration', () => {
    const helperDeps = () => ({
      http,
      overlays: { openFlyout: jest.fn() },
      rendering: {
        addContext: (element: ReactNode) => element as ReactElement,
      },
    });

    beforeEach(() => {
      localStorage.clear();
      delete globalThis.toggleFeatureFlagsHelper;
      jest.mocked(mountFeatureFlagsHelper).mockClear();
    });

    test('toggles the corner button and closes the flyout when hiding it', async () => {
      featureFlagsService.registerHelper(helperDeps());
      expect(globalThis.toggleFeatureFlagsHelper).toEqual(expect.any(Function));
      expect(mountFeatureFlagsHelper).not.toHaveBeenCalled();

      globalThis.toggleFeatureFlagsHelper?.();
      await flushAsyncWork();

      expect(localStorage.getItem('core.featureFlags.helper.enabled')).toBe('true');
      expect(mountFeatureFlagsHelper).toHaveBeenCalledWith(
        expect.objectContaining({ cornerButtonVisible: true })
      );
      const mounted = jest.mocked(mountFeatureFlagsHelper).mock.results[0]?.value;

      globalThis.toggleFeatureFlagsHelper?.();
      await flushAsyncWork();

      expect(localStorage.getItem('core.featureFlags.helper.enabled')).toBe('false');
      expect(mounted?.setCornerButtonVisible).toHaveBeenCalledWith(false);
      expect(mounted?.close).toHaveBeenCalledTimes(1);
      expect(mounted?.unmount).not.toHaveBeenCalled();
    });

    test('opens the helper flyout from the developer toolbar without storing the button', async () => {
      const open = jest.fn();
      const close = jest.fn();
      const setCornerButtonVisible = jest.fn();
      jest.mocked(mountFeatureFlagsHelper).mockReturnValue({
        unmount: jest.fn(),
        open,
        close,
        setCornerButtonVisible,
      });
      const { helper } = await featureFlagsService.start();
      featureFlagsService.registerHelper(helperDeps());

      helper.open();
      await flushAsyncWork();

      expect(localStorage.getItem('core.featureFlags.helper.enabled')).toBeNull();
      expect(mountFeatureFlagsHelper).toHaveBeenCalledWith(
        expect.objectContaining({ cornerButtonVisible: false })
      );
      expect(open).toHaveBeenCalledTimes(1);

      globalThis.toggleFeatureFlagsHelper?.();
      await flushAsyncWork();

      expect(localStorage.getItem('core.featureFlags.helper.enabled')).toBe('true');
      expect(setCornerButtonVisible).toHaveBeenCalledWith(true);
      expect(mountFeatureFlagsHelper).toHaveBeenCalledTimes(1);
    });

    test('restores the corner button when it was left visible', async () => {
      localStorage.setItem('core.featureFlags.helper.enabled', 'true');
      featureFlagsService.registerHelper(helperDeps());
      await flushAsyncWork();
      expect(mountFeatureFlagsHelper).toHaveBeenCalledWith(
        expect.objectContaining({ cornerButtonVisible: true })
      );
    });

    test('refresh asks the provider to load the current context again', async () => {
      const setContext = jest.spyOn(OpenFeature, 'setContext').mockResolvedValue(undefined);
      featureFlagsService.setup(createSetupDeps());
      await featureFlagsService.refresh();
      expect(setContext).toHaveBeenCalledWith({ kind: 'multi' });
    });
  });
});
