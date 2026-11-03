/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockFlagEvaluationCounterAdd } from './feature_flags_service.test.mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import apm from 'elastic-apm-node';
import {
  type Client,
  OpenFeature,
  type Provider,
  ServerProviderEvents,
} from '@openfeature/server-sdk';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { FeatureFlagsService, type InternalFeatureFlagsStart } from '..';
import type { FeatureFlagsConfig } from './feature_flags_config';

describe('FeatureFlagsService Server', () => {
  let featureFlagsService: FeatureFlagsService;
  let featureFlagsClient: Client;
  let config$: BehaviorSubject<FeatureFlagsConfig>;

  beforeEach(() => {
    const getClientSpy = jest.spyOn(OpenFeature, 'getClient');
    const mockedConfigService = configServiceMock.create();
    config$ = new BehaviorSubject<FeatureFlagsConfig>({
      overrides: {
        'my-overridden-flag': true,
        'myPlugin.myOverriddenFlag': true,
        myDestructuredObjPlugin: { myOverriddenFlag: true },
      },
    });
    mockedConfigService.atPath.mockReturnValue(config$);
    featureFlagsService = new FeatureFlagsService(
      mockCoreContext.create({
        configService: mockedConfigService,
      })
    );
    featureFlagsClient = getClientSpy.mock.results[0].value;
  });

  afterEach(async () => {
    jest.useRealTimers();
    await featureFlagsService.stop();
    jest.spyOn(OpenFeature, 'setProviderAndWait').mockRestore(); // Make sure that we clean up any previous mocked implementations
    jest.clearAllMocks();
    await OpenFeature.clearProviders();
  });

  describe('provider handling', () => {
    test('appends a provider (no async operation)', () => {
      expect.assertions(1);
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait');
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(spy).toHaveBeenCalledWith(fakeProvider);
    });

    test('throws an error if called twice', () => {
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(() => setProvider(fakeProvider)).toThrowErrorMatchingInlineSnapshot(
        `"A provider has already been set. This API cannot be called twice."`
      );
    });

    test('registers a handler to reevaluate flags when the provider is ready', () => {
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const addHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(addHandlerSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready, expect.any(Function));
      addHandlerSpy.mockRestore();
    });
  });

  describe('context handling', () => {
    let setContextSpy: jest.SpyInstance;

    beforeEach(() => {
      setContextSpy = jest.spyOn(OpenFeature, 'setContext');
    });

    test('appends context to the provider', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('appends context to the provider (start method)', () => {
      featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const { appendContext } = featureFlagsService.start();
      appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('full multi context pass-through', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const context = {
        kind: 'multi' as const,
        kibana: {
          key: 'kibana-1',
        },
        organization: {
          key: 'organization-1',
        },
      };
      appendContext(context);
      expect(setContextSpy).toHaveBeenCalledWith(context);
    });

    test('appends to the existing context', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const initialContext = {
        kind: 'multi' as const,
        kibana: {
          key: 'kibana-1',
        },
        organization: {
          key: 'organization-1',
        },
      };
      appendContext(initialContext);
      expect(setContextSpy).toHaveBeenCalledWith(initialContext);

      appendContext({ kind: 'multi', kibana: { has_data: true } });
      expect(setContextSpy).toHaveBeenCalledWith({
        ...initialContext,
        kibana: {
          ...initialContext.kibana,
          has_data: true,
        },
      });
    });

    test('converts single-contexts to multi-context', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      appendContext({ kind: 'organization', key: 'organization-1' });
      expect(setContextSpy).toHaveBeenCalledWith({
        kind: 'multi',
        organization: {
          key: 'organization-1',
        },
      });
    });

    test('if no `kind` provided, it defaults to the kibana context', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      appendContext({ key: 'key-1', has_data: false });
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
    let startContract: InternalFeatureFlagsStart;
    let apmSpy: jest.SpyInstance;
    let addHandlerSpy: jest.SpyInstance;

    beforeEach(() => {
      mockFlagEvaluationCounterAdd.mockClear();
      addHandlerSpy = jest.spyOn(featureFlagsClient, 'addHandler');
      featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      startContract = featureFlagsService.start();
      apmSpy = jest.spyOn(apm, 'addLabels');
    });

    // We don't need to test the client, just our APIs, so testing that it returns the fallback value should be enough.
    test('get boolean flag', async () => {
      const value = false;
      await expect(startContract.getBooleanValue('my-flag', value)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': `${value}`,
      });
    });

    test('get string flag', async () => {
      const value = 'my-default';
      await expect(startContract.getStringValue('my-flag', value)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': `${value}`,
      });
    });

    test('get number flag', async () => {
      const value = 42;
      await expect(startContract.getNumberValue('my-flag', value)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': `${value}`,
      });
    });

    test('observe a boolean flag', async () => {
      const value = false;
      const flag$ = startContract.getBooleanValue$('my-flag', value);
      const observedValues: boolean[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': `${value}`,
      });
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
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(3);
    });

    test('observe a string flag', async () => {
      const value = 'my-value';
      const flag$ = startContract.getStringValue$('my-flag', value);
      const observedValues: string[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
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
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
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
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
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
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await expect(firstValueFrom(flag$)).resolves.toEqual(value);
      expect(observedValues).toHaveLength(3);
    });

    test('with overrides', async () => {
      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      await expect(startContract.getBooleanValue('my-overridden-flag', false)).resolves.toEqual(
        true
      );
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-overridden-flag': true }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-overridden-flag',
        'feature_flag.value': `true`,
      });
      expect(getBooleanValueSpy).not.toHaveBeenCalled();

      // Only to prove the spy works
      await expect(startContract.getBooleanValue('another-flag', false)).resolves.toEqual(false);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      expect(getBooleanValueSpy).toHaveBeenCalledWith('another-flag', false);
    });

    test('observe a number flag with overrides', async () => {
      const flag$ = startContract.getBooleanValue$('my-overridden-flag', false);
      const observedValues: boolean[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await expect(firstValueFrom(flag$)).resolves.toEqual(true);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-overridden-flag': true }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-overridden-flag',
        'feature_flag.value': `true`,
      });
      expect(observedValues).toHaveLength(1);

      // Does not reevaluate and emit if the other flags are changed
      config$.next({
        overrides: {
          'my-overridden-flag': true,
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await expect(firstValueFrom(flag$)).resolves.toEqual(true);
      expect(observedValues).toHaveLength(1); // still 1

      // Reevaluates and emits when the observed flag is changed
      config$.next({
        overrides: {
          'my-overridden-flag': false,
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await expect(firstValueFrom(flag$)).resolves.toEqual(false);
      expect(observedValues).toHaveLength(2);
      expect(observedValues).toStrictEqual([true, false]);

      // Reevaluates and emits when the observed flag is changed (removed)
      config$.next({
        overrides: {
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await expect(firstValueFrom(flag$)).resolves.toEqual(false);
      expect(observedValues).toHaveLength(3);
      expect(observedValues).toStrictEqual([true, false, false]);
    });

    test('overrides with dotted names', async () => {
      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      await expect(
        startContract.getBooleanValue('myPlugin.myOverriddenFlag', false)
      ).resolves.toEqual(true);
      await expect(
        startContract.getBooleanValue('myDestructuredObjPlugin.myOverriddenFlag', false)
      ).resolves.toEqual(true);
      expect(getBooleanValueSpy).not.toHaveBeenCalled();
    });

    describe('waits for evaluation context', () => {
      let providerMetadataSpy: jest.SpiedGetter<typeof OpenFeature.providerMetadata>;

      beforeEach(() => {
        // A configured provider is what arms the wait: without it, evaluations use the NOOP
        // provider and skip waiting (covered by the tests above).
        providerMetadataSpy = jest
          .spyOn(OpenFeature, 'providerMetadata', 'get')
          .mockReturnValue({ name: 'test-provider' });
      });

      afterEach(() => {
        providerMetadataSpy.mockRestore();
      });

      test('does not evaluate until context has targeting keys', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        // A no-op context update must not unblock the wait.
        startContract.appendContext({ kind: 'multi' });
        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });

      test('does not wait when context is already set', async () => {
        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');

        await expect(startContract.getBooleanValue('my-flag', false)).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      });

      test('does not wait when the flag is overridden', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');

        await expect(startContract.getBooleanValue('my-overridden-flag', false)).resolves.toEqual(
          true
        );
        expect(getBooleanValueSpy).not.toHaveBeenCalled();
      });

      test('resolves if the service stops before context is ready', async () => {
        const evaluation = startContract.getBooleanValue('my-flag', false);
        await Promise.resolve();

        await expect(featureFlagsService.stop()).resolves.toBeUndefined();
        await expect(evaluation).resolves.toEqual(false);
      });

      test('times out and evaluates when a provider is set but context never arrives', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        // Same shape as plugin functional tests: experiments provider is configured, but
        // there is no xpack.cloud.id so appendContext never adds targeting keys.
        await jest.advanceTimersByTimeAsync(199);
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });

      test('observable evaluation waits for context as well', async () => {
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        await Promise.resolve();
        expect(observedValues).toHaveLength(0);

        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        await expect(firstValueFrom(flag$)).resolves.toEqual(false);
        expect(observedValues).toEqual([false]);
      });
    });

    test('reevaluates subscribed flags when the provider becomes ready', async () => {
      // setProvider is not called in this suite's beforeEach, so register it here.
      const openFeatureAddHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockResolvedValue();
      setProvider({ metadata: { name: 'fake provider' } } as Provider);

      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      getBooleanValueSpy.mockResolvedValue(false);

      const observedValues: boolean[] = [];
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe((v) => observedValues.push(v));
      await expect(firstValueFrom(flag$)).resolves.toEqual(false);
      expect(observedValues).toEqual([false]);

      const readyHandler = openFeatureAddHandlerSpy.mock.calls.find(
        ([event]) => event === ServerProviderEvents.Ready
      )?.[1];
      expect(readyHandler).toBeDefined();

      getBooleanValueSpy.mockResolvedValue(true);
      await readyHandler!();
      await expect(firstValueFrom(flag$)).resolves.toEqual(true);
      expect(observedValues).toEqual([false, true]);

      openFeatureAddHandlerSpy.mockRestore();
    });
  });

  test('returns overrides', () => {
    const { getOverrides } = featureFlagsService.setup({
      http: httpServiceMock.createInternalSetupContract(),
    });
    expect(getOverrides()).toStrictEqual({
      'my-overridden-flag': true,
      'myPlugin.myOverriddenFlag': true,
      'myDestructuredObjPlugin.myOverriddenFlag': true,
    });
  });

  describe('counter route', () => {
    beforeEach(() => {
      mockFlagEvaluationCounterAdd.mockClear();
    });

    test('registers the counter route on setup', () => {
      const http = httpServiceMock.createInternalSetupContract();
      const router = mockRouter.create();
      http.createRouter.mockReturnValue(router);

      featureFlagsService.setup({ http });

      expect(http.createRouter).toHaveBeenCalledWith('');
      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/feature-flags/{flagName}/counter',
          options: { access: 'internal' },
          security: {
            authz: {
              enabled: false,
              reason: 'Any authenticated user should have access to the configuration',
            },
            authc: {
              enabled: true,
            },
          },
        }),
        expect.any(Function)
      );
    });

    test('increments the counter via the route handler', () => {
      const http = httpServiceMock.createInternalSetupContract();
      const router = mockRouter.create();
      http.createRouter.mockReturnValue(router);

      featureFlagsService.setup({ http });

      const handler = (router.post as jest.Mock).mock.calls[0][1];
      const response = mockRouter.createResponseFactory();
      const request = mockRouter.createKibanaRequest({
        params: { flagName: 'my-flag' },
        body: { value: true },
        method: 'post',
      });

      handler({}, request, response);

      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': 'true',
      });
      expect(response.accepted).toHaveBeenCalled();
    });
  });

  describe('bootstrapping helpers', () => {
    test('return empty initial feature flags if no getter registered', async () => {
      const { getInitialFeatureFlags } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      await expect(getInitialFeatureFlags()).resolves.toEqual({});
    });

    test('calls the getter when registered', async () => {
      const { setInitialFeatureFlagsGetter, getInitialFeatureFlags } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
      });
      const mockGetter = jest.fn().mockResolvedValue({ myFlag: true });
      setInitialFeatureFlagsGetter(mockGetter);
      await expect(getInitialFeatureFlags()).resolves.toEqual({ myFlag: true });
      expect(mockGetter).toHaveBeenCalledTimes(1);
    });
  });
});
