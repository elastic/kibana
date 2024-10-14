/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { apm } from '@elastic/apm-rum';
import { type Client, OpenFeature, type Provider } from '@openfeature/web-sdk';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import { FeatureFlagsService } from '..';

async function isSettledPromise(p: Promise<unknown>) {
  const immediateValue = {};
  const result = await Promise.race([p, immediateValue]);
  return result !== immediateValue;
}

describe('FeatureFlagsService Browser', () => {
  let featureFlagsService: FeatureFlagsService;
  let featureFlagsClient: Client;
  let injectedMetadata: jest.Mocked<InternalInjectedMetadataSetup>;

  beforeEach(() => {
    const getClientSpy = jest.spyOn(OpenFeature, 'getClient');
    featureFlagsService = new FeatureFlagsService(coreContextMock.create());
    featureFlagsClient = getClientSpy.mock.results[0].value;
    injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  });

  afterEach(async () => {
    await featureFlagsService.stop();
    jest.clearAllMocks();
    await OpenFeature.clearProviders();
    await OpenFeature.clearContexts();
  });

  describe('provider handling', () => {
    test('appends a provider (without awaiting)', () => {
      expect.assertions(1);
      const { setProvider } = featureFlagsService.setup({ injectedMetadata });
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait');
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(spy).toHaveBeenCalledWith(fakeProvider);
    });

    test('throws an error if called twice', () => {
      const { setProvider } = featureFlagsService.setup({ injectedMetadata });
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(() => setProvider(fakeProvider)).toThrowErrorMatchingInlineSnapshot(
        `"A provider has already been set. This API cannot be called twice."`
      );
    });

    test('awaits initialization in the start context', async () => {
      const { setProvider } = featureFlagsService.setup({ injectedMetadata });
      let externalResolve: Function = () => void 0;
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementation(async () => {
        await new Promise((resolve) => {
          externalResolve = resolve;
        });
      });
      const fakeProvider = {} as Provider;
      setProvider(fakeProvider);
      expect(spy).toHaveBeenCalledWith(fakeProvider);
      const startPromise = featureFlagsService.start();
      await expect(isSettledPromise(startPromise)).resolves.toBe(false);
      externalResolve();
      await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise resolution to spread
      await expect(isSettledPromise(startPromise)).resolves.toBe(true);
    });

    test('do not hold for too long during initialization', async () => {
      const { setProvider } = featureFlagsService.setup({ injectedMetadata });
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementation(async () => {
        await new Promise(() => {}); // never resolves
      });
      const apmCaptureErrorSpy = jest.spyOn(apm, 'captureError');
      const fakeProvider = {} as Provider;
      setProvider(fakeProvider);
      expect(spy).toHaveBeenCalledWith(fakeProvider);
      const startPromise = featureFlagsService.start();
      await expect(isSettledPromise(startPromise)).resolves.toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 2100)); // A bit longer than 2 seconds
      await expect(isSettledPromise(startPromise)).resolves.toBe(true);
      expect(apmCaptureErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('The feature flags provider took too long to initialize.')
      );
    });
  });

  describe('context handling', () => {
    let setContextSpy: jest.SpyInstance;

    beforeEach(() => {
      setContextSpy = jest.spyOn(OpenFeature, 'setContext');
    });

    test('appends context to the provider', async () => {
      const { appendContext } = featureFlagsService.setup({ injectedMetadata });
      await appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('appends context to the provider (start method)', async () => {
      featureFlagsService.setup({ injectedMetadata });
      const { appendContext } = await featureFlagsService.start();
      await appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('full multi context pass-through', async () => {
      const { appendContext } = featureFlagsService.setup({ injectedMetadata });
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
      const { appendContext } = featureFlagsService.setup({ injectedMetadata });
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
      const { appendContext } = featureFlagsService.setup({ injectedMetadata });
      await appendContext({ kind: 'organization', key: 'organization-1' });
      expect(setContextSpy).toHaveBeenCalledWith({
        kind: 'multi',
        organization: {
          key: 'organization-1',
        },
      });
    });

    test('if no `kind` provided, it defaults to the kibana context', async () => {
      const { appendContext } = featureFlagsService.setup({ injectedMetadata });
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
      injectedMetadata.getFeatureFlags.mockReturnValue({
        overrides: { 'my-overridden-flag': true },
      });
      featureFlagsService.setup({ injectedMetadata });
      startContract = await featureFlagsService.start();
      apmSpy = jest.spyOn(apm, 'addLabels');
    });

    // We don't need to test the client, just our APIs, so testing that it returns the fallback value should be enough.
    test('get boolean flag', () => {
      const value = false;
      expect(startContract.getBooleanValue('my-flag', value)).toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
    });

    test('get string flag', () => {
      const value = 'my-default';
      expect(startContract.getStringValue('my-flag', value)).toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
    });

    test('get number flag', () => {
      const value = 42;
      expect(startContract.getNumberValue('my-flag', value)).toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value });
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
    });

    test('with overrides', async () => {
      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      expect(startContract.getBooleanValue('my-overridden-flag', false)).toEqual(true);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-overridden-flag': true });
      expect(getBooleanValueSpy).not.toHaveBeenCalled();

      // Only to prove the spy works
      expect(startContract.getBooleanValue('another-flag', false)).toEqual(false);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      expect(getBooleanValueSpy).toHaveBeenCalledWith('another-flag', false);
    });
  });
});
