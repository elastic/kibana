/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockFlagEvaluationCounterAdd } from './feature_flags_service.test.mocks';
import { ReservedPrivilegesSet } from '@kbn/core-http-server';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { BehaviorSubject } from 'rxjs';
import apm from 'elastic-apm-node';
import {
  type Client,
  OpenFeature,
  type Provider,
  ServerProviderEvents,
} from '@openfeature/server-sdk';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  FeatureFlagsService,
  type InternalFeatureFlagsSetup,
  type InternalFeatureFlagsStart,
} from '..';
import type { FeatureFlagsConfig } from './feature_flags_config';
import {
  FEATURE_FLAGS_OVERRIDES_API_PATH,
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
} from './overrides_saved_object';

describe('FeatureFlagsService Server', () => {
  let featureFlagsService: FeatureFlagsService;
  let featureFlagsClient: Client;
  let config$: BehaviorSubject<FeatureFlagsConfig>;
  let logger: MockedLogger;

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
    logger = loggerMock.create();
    featureFlagsService = new FeatureFlagsService(
      mockCoreContext.create({
        configService: mockedConfigService,
        logger,
      })
    );
    featureFlagsClient = getClientSpy.mock.results[0].value;
  });

  afterEach(async () => {
    jest.useRealTimers();
    await featureFlagsService.stop();
    jest.spyOn(OpenFeature, 'setProviderAndWait').mockRestore(); // Make sure that we clean up any previous mocked implementations
    jest.clearAllMocks();
    OpenFeature.clearHandlers();
    await OpenFeature.clearProviders();
  });

  describe('provider handling', () => {
    test('appends a provider (no async operation)', () => {
      expect.assertions(1);
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait');
      const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
      setProvider(fakeProvider);
      expect(spy).toHaveBeenCalledWith(fakeProvider);
    });

    test('throws an error if called twice', () => {
      const { setProvider } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('appends context to the provider (start method)', () => {
      featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      const { appendContext } = featureFlagsService.start({
        savedObjects: savedObjectsServiceMock.createInternalStartContract(),
      });
      appendContext({ kind: 'multi' });
      expect(setContextSpy).toHaveBeenCalledWith({ kind: 'multi' });
    });

    test('full multi context pass-through', () => {
      const { appendContext } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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
    let setupContract: InternalFeatureFlagsSetup;
    let startContract: InternalFeatureFlagsStart;
    let apmSpy: jest.SpyInstance;
    let addHandlerSpy: jest.SpyInstance;

    beforeEach(() => {
      mockFlagEvaluationCounterAdd.mockClear();
      addHandlerSpy = jest.spyOn(featureFlagsClient, 'addHandler');
      setupContract = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      startContract = featureFlagsService.start({
        savedObjects: savedObjectsServiceMock.createInternalStartContract(),
      });
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
      jest.useFakeTimers();
      const value = false;
      const flag$ = startContract.getBooleanValue$('my-flag', value);
      const observedValues: boolean[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-flag',
        'feature_flag.value': `${value}`,
      });

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value]);

      // Reevaluates and emits when the context is changed
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value, value]);
    });

    test('debounces rapid triggers and queues one that arrives during an evaluation', async () => {
      jest.useFakeTimers();
      let resolveEvaluation: (value: boolean) => void = () => {};
      const getBooleanValueSpy = jest
        .spyOn(featureFlagsClient, 'getBooleanValue')
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveEvaluation = resolve;
            })
        );

      const openFeatureAddHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
      let resolveProviderSetup: () => void = () => {};
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProviderSetup = () => {
              resolve();
            };
          })
      );
      setupContract.setProvider({ metadata: { name: 'fake provider' } } as Provider);
      const readyHandler = openFeatureAddHandlerSpy.mock.calls.find(
        ([event]) => event === ServerProviderEvents.Ready
      )?.[1];
      expect(readyHandler).toBeDefined();

      const observedValues: boolean[] = [];
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe((value) => observedValues.push(value));
      // These arrive inside the same debounce window as the initial subscription.
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      readyHandler!();

      await jest.advanceTimersByTimeAsync(9);
      expect(getBooleanValueSpy).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      expect(observedValues).toEqual([]);

      // A trigger during the evaluation is held until that evaluation finishes.
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);

      resolveEvaluation(true);
      await jest.advanceTimersByTimeAsync(0);
      expect(observedValues).toEqual([true]);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(2);

      resolveEvaluation(false);
      await jest.advanceTimersByTimeAsync(0);
      expect(observedValues).toEqual([true, false]);

      resolveProviderSetup();
      openFeatureAddHandlerSpy.mockRestore();
    });

    test('observe a string flag', async () => {
      jest.useFakeTimers();
      const value = 'my-value';
      const flag$ = startContract.getStringValue$('my-flag', value);
      const observedValues: string[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value]);

      // Reevaluates and emits when the context is changed
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value, value]);
    });

    test('observe a number flag', async () => {
      jest.useFakeTimers();
      const value = 42;
      const flag$ = startContract.getNumberValue$('my-flag', value);
      const observedValues: number[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-flag': value }, undefined);

      // Does not reevaluate and emit if the other flags are changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['another-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value]);

      // Reevaluates and emits when the observed flag is changed
      addHandlerSpy.mock.calls[0][1]({ flagsChanged: ['my-flag'] });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value]);

      // Reevaluates and emits when the context is changed
      startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-2' } });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([value, value, value]);
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
      jest.useFakeTimers();
      const flag$ = startContract.getBooleanValue$('my-overridden-flag', false);
      const observedValues: boolean[] = [];
      flag$.subscribe((v) => observedValues.push(v));
      // Initial emission
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toStrictEqual([true]);
      expect(apmSpy).toHaveBeenCalledWith({ 'flag_my-overridden-flag': true }, undefined);
      expect(mockFlagEvaluationCounterAdd).toHaveBeenCalledWith(1, {
        'feature_flag.key': 'my-overridden-flag',
        'feature_flag.value': `true`,
      });

      // Does not reevaluate and emit if the other flags are changed
      config$.next({
        overrides: {
          'my-overridden-flag': true,
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toStrictEqual([true]);

      // Reevaluates and emits when the observed flag is changed
      config$.next({
        overrides: {
          'my-overridden-flag': false,
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toStrictEqual([true, false]);

      // Reevaluates and emits when the observed flag is changed (removed)
      config$.next({
        overrides: {
          'myPlugin.myOverriddenFlag': false,
        },
      });
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toStrictEqual([true, false, false]);
    });

    test('treats string boolean overrides as booleans', async () => {
      config$.next({
        overrides: {
          'securitySolution.attackDiscoveryWorkflowsEnabled': 'false',
          'ingestHub.onboardingEnabled': 'true',
          'my-string-flag': 'false',
        },
      });

      await expect(
        startContract.getBooleanValue('securitySolution.attackDiscoveryWorkflowsEnabled', true)
      ).resolves.toBe(false);
      await expect(
        startContract.getBooleanValue('ingestHub.onboardingEnabled', false)
      ).resolves.toBe(true);
      await expect(startContract.getStringValue('my-string-flag', 'fallback')).resolves.toBe(
        'false'
      );
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
        jest.useFakeTimers();
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        await jest.advanceTimersByTimeAsync(10);
        expect(observedValues).toHaveLength(0);

        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        await jest.advanceTimersByTimeAsync(0);
        expect(observedValues).toEqual([false]);
      });
    });

    test('evaluates a subscribed flag once when the provider is not pending', async () => {
      jest.useFakeTimers();
      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      const observedValues: boolean[] = [];
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe((value) => observedValues.push(value));

      await jest.advanceTimersByTimeAsync(10);

      expect(observedValues).toEqual([false]);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
    });

    test('reevaluates subscribed flags when the provider becomes ready', async () => {
      jest.useFakeTimers();
      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      getBooleanValueSpy.mockResolvedValue(false);

      const observedValues: boolean[] = [];
      const flag$ = startContract.getBooleanValue$('my-flag', false);
      flag$.subscribe((v) => observedValues.push(v));
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([false]);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);

      // Register the provider after the initial evaluation. Going not-ready must not emit.
      // Keep setup pending so its completion does not race the Ready handler.
      const openFeatureAddHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
      let resolveProviderSetup: () => void = () => {};
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProviderSetup = () => {
              resolve();
            };
          })
      );
      setupContract.setProvider({ metadata: { name: 'fake provider' } } as Provider);
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([false]);

      const readyHandler = openFeatureAddHandlerSpy.mock.calls.find(
        ([event]) => event === ServerProviderEvents.Ready
      )?.[1];
      expect(readyHandler).toBeDefined();

      getBooleanValueSpy.mockResolvedValue(true);
      readyHandler!();
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([false, true]);

      // Setup completion marks the provider ready again, so the subscription evaluates once more.
      resolveProviderSetup();
      await jest.advanceTimersByTimeAsync(10);
      expect(observedValues).toEqual([false, true, true]);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(3);

      openFeatureAddHandlerSpy.mockRestore();
    });

    test('does not wait after provider setup gives up', async () => {
      jest.useFakeTimers();
      jest.spyOn(OpenFeature, 'setProviderAndWait').mockRejectedValue(new Error('setup failed'));
      setupContract.setProvider({ metadata: { name: 'fake provider' } } as Provider);

      // Initial attempt plus 5 retries, then the failure is reported.
      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(1000 * Math.pow(2, i));
      }
      await jest.advanceTimersByTimeAsync(32_000);

      const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
      await expect(startContract.getBooleanValue('my-flag', false)).resolves.toEqual(false);
      expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
    });

    describe('waits for the provider to be ready', () => {
      let markProviderReady: () => void;
      let resolveProviderSetup: (() => void) | undefined;

      beforeEach(() => {
        const openFeatureAddHandlerSpy = jest.spyOn(OpenFeature, 'addHandler');
        // Leave setup pending. A resolved setup marks the provider ready in `finally`,
        // which would skip the wait these tests are checking.
        jest.spyOn(OpenFeature, 'setProviderAndWait').mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveProviderSetup = () => {
                resolve();
              };
            })
        );
        setupContract.setProvider({ metadata: { name: 'fake provider' } } as Provider);
        const readyHandler = openFeatureAddHandlerSpy.mock.calls.find(
          ([event]) => event === ServerProviderEvents.Ready
        )?.[1];
        if (!readyHandler) {
          throw new Error('Expected a provider Ready handler to be registered');
        }
        markProviderReady = () => {
          readyHandler();
        };
      });

      afterEach(() => {
        resolveProviderSetup?.();
        resolveProviderSetup = undefined;
        jest.spyOn(OpenFeature, 'addHandler').mockRestore();
      });

      test('holds every evaluation type until the provider is ready', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const getStringValueSpy = jest.spyOn(featureFlagsClient, 'getStringValue');
        const getNumberValueSpy = jest.spyOn(featureFlagsClient, 'getNumberValue');

        const booleanEvaluation = startContract.getBooleanValue('bool-flag', false);
        const stringEvaluation = startContract.getStringValue('string-flag', 'fallback');
        const numberEvaluation = startContract.getNumberValue('number-flag', 1);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();
        expect(getStringValueSpy).not.toHaveBeenCalled();
        expect(getNumberValueSpy).not.toHaveBeenCalled();

        markProviderReady();

        await expect(booleanEvaluation).resolves.toEqual(false);
        await expect(stringEvaluation).resolves.toEqual('fallback');
        await expect(numberEvaluation).resolves.toEqual(1);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('bool-flag', false);
        expect(getStringValueSpy).toHaveBeenCalledTimes(1);
        expect(getStringValueSpy).toHaveBeenCalledWith('string-flag', 'fallback');
        expect(getNumberValueSpy).toHaveBeenCalledTimes(1);
        expect(getNumberValueSpy).toHaveBeenCalledWith('number-flag', 1);
      });

      test('does not wait when the provider is already ready', async () => {
        markProviderReady();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');

        await expect(startContract.getBooleanValue('my-flag', false)).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });

      test('evaluates a new subscription once when the provider is already ready', async () => {
        jest.useFakeTimers();
        markProviderReady();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        await jest.advanceTimersByTimeAsync(10);

        expect(observedValues).toEqual([false]);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
      });

      test('collapses repeated ready signals in one debounce window and evaluates a later one', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        markProviderReady();
        markProviderReady();
        await jest.advanceTimersByTimeAsync(10);
        expect(observedValues).toEqual([false]);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);

        markProviderReady();
        await jest.advanceTimersByTimeAsync(10);
        expect(observedValues).toEqual([false, false]);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(2);
      });

      test('does not wait when the flag is overridden', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');

        await expect(startContract.getBooleanValue('my-overridden-flag', false)).resolves.toEqual(
          true
        );
        expect(getBooleanValueSpy).not.toHaveBeenCalled();
      });

      test('observable overrides do not wait for the provider', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-overridden-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        await jest.advanceTimersByTimeAsync(10);
        expect(observedValues).toEqual([true]);
        expect(getBooleanValueSpy).not.toHaveBeenCalled();
      });

      test('times out and evaluates when the provider never becomes ready', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(9_999);
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });

      test('does not wait again after the provider wait has timed out', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        await jest.advanceTimersByTimeAsync(10_000);
        await expect(evaluation).resolves.toEqual(false);

        await expect(startContract.getBooleanValue('another-flag', true)).resolves.toEqual(true);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(2);
        expect(getBooleanValueSpy).toHaveBeenLastCalledWith('another-flag', true);
      });

      test('unblocks every evaluation waiting on the provider', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const first = startContract.getBooleanValue('flag-a', false);
        const second = startContract.getBooleanValue('flag-b', true);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        markProviderReady();

        await expect(first).resolves.toEqual(false);
        await expect(second).resolves.toEqual(true);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(2);
        expect(getBooleanValueSpy).toHaveBeenNthCalledWith(1, 'flag-a', false);
        expect(getBooleanValueSpy).toHaveBeenNthCalledWith(2, 'flag-b', true);
      });

      test('observable evaluation waits for the provider as well', async () => {
        jest.useFakeTimers();
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        getBooleanValueSpy.mockResolvedValue(false);
        const observedValues: boolean[] = [];
        const flag$ = startContract.getBooleanValue$('my-flag', false);
        flag$.subscribe((value) => observedValues.push(value));

        await jest.advanceTimersByTimeAsync(10);
        expect(observedValues).toHaveLength(0);
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        getBooleanValueSpy.mockResolvedValue(true);
        markProviderReady();

        // Flush the held evaluation without closing the debounce window of the reevaluation it triggers.
        await jest.advanceTimersByTimeAsync(0);
        expect(observedValues).toEqual([true]);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });

      test('waits for the evaluation context and the provider', async () => {
        const providerMetadataSpy = jest
          .spyOn(OpenFeature, 'providerMetadata', 'get')
          .mockReturnValue({ name: 'test-provider' });
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        markProviderReady();
        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);

        providerMetadataSpy.mockRestore();
      });

      test('stays blocked on the provider after the context is ready', async () => {
        const providerMetadataSpy = jest
          .spyOn(OpenFeature, 'providerMetadata', 'get')
          .mockReturnValue({ name: 'test-provider' });
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);

        startContract.appendContext({ kind: 'multi', kibana: { key: 'kibana-1' } });
        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        markProviderReady();
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);

        providerMetadataSpy.mockRestore();
      });

      test('resolves if the service stops before the provider is ready', async () => {
        const getBooleanValueSpy = jest.spyOn(featureFlagsClient, 'getBooleanValue');
        const evaluation = startContract.getBooleanValue('my-flag', false);
        await Promise.resolve();
        expect(getBooleanValueSpy).not.toHaveBeenCalled();

        await expect(featureFlagsService.stop()).resolves.toBeUndefined();
        await expect(evaluation).resolves.toEqual(false);
        expect(getBooleanValueSpy).toHaveBeenCalledTimes(1);
        expect(getBooleanValueSpy).toHaveBeenCalledWith('my-flag', false);
      });
    });
  });

  test('returns overrides', () => {
    const { getOverrides } = featureFlagsService.setup({
      http: httpServiceMock.createInternalSetupContract(),
      savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
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

      featureFlagsService.setup({
        http,
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });

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

      featureFlagsService.setup({
        http,
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });

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
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      await expect(getInitialFeatureFlags()).resolves.toEqual({});
    });

    test('calls the getter when registered', async () => {
      const { setInitialFeatureFlagsGetter, getInitialFeatureFlags } = featureFlagsService.setup({
        http: httpServiceMock.createInternalSetupContract(),
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      const mockGetter = jest.fn().mockResolvedValue({ myFlag: true });
      setInitialFeatureFlagsGetter(mockGetter);
      await expect(getInitialFeatureFlags()).resolves.toEqual({ myFlag: true });
      expect(mockGetter).toHaveBeenCalledTimes(1);
    });
  });

  describe('runtime overrides', () => {
    const savedObject = (overrides: Record<string, unknown>, version: string) => ({
      id: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
      type: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
      attributes: { overrides },
      references: [],
      version,
    });

    const startWithRepository = () => {
      const repository = savedObjectsRepositoryMock.create();
      const http = httpServiceMock.createInternalSetupContract();
      const router = mockRouter.create();
      http.createRouter.mockReturnValue(router);
      const savedObjects = savedObjectsServiceMock.createInternalStartContract();
      savedObjects.createInternalRepository.mockReturnValue(repository);
      const setup = featureFlagsService.setup({
        http,
        savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
      });
      const start = featureFlagsService.start({ savedObjects });
      return { repository, router, setup, start };
    };

    const findRoute = (
      router: ReturnType<typeof mockRouter.create>,
      method: 'get' | 'put' | 'delete',
      path: string
    ) => {
      const call = (router[method] as jest.Mock).mock.calls.find(
        ([options]) => options.path === path
      );
      if (!call) {
        throw new Error(`${method.toUpperCase()} ${path} was not registered`);
      }
      return { options: call[0], handler: call[1] as Function };
    };

    test('registers the saved object type and superuser routes', () => {
      const savedObjects = savedObjectsServiceMock.createInternalSetupContract();
      const http = httpServiceMock.createInternalSetupContract();
      const router = mockRouter.create();
      http.createRouter.mockReturnValue(router);
      featureFlagsService.setup({ http, savedObjects });

      expect(savedObjects.registerType).toHaveBeenCalledWith(
        expect.objectContaining({
          name: FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          hidden: true,
          namespaceType: 'agnostic',
        })
      );
      const { options } = findRoute(router, 'put', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      expect(options.security.authz.requiredPrivileges).toEqual([ReservedPrivilegesSet.superuser]);
      expect(options.options.access).toBe('internal');
    });

    test('records evaluated flags for the helper', async () => {
      jest.useFakeTimers();
      const { router, start } = startWithRepository();
      await start.getBooleanValue('my-flag', false);

      const { handler } = findRoute(router, 'get', FEATURE_FLAGS_OVERRIDES_API_PATH);
      const response = mockRouter.createResponseFactory();
      await handler({}, mockRouter.createKibanaRequest({ method: 'get' }), response);

      expect(response.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          evaluatedFlags: expect.arrayContaining([{ key: 'my-flag', value: false }]),
        }),
      });
    });

    test('lets a runtime override win over config and notifies subscribers', async () => {
      jest.useFakeTimers();
      const { repository, setup, start } = startWithRepository();
      repository.get.mockResolvedValue(
        savedObject({ 'my-overridden-flag': false, 'runtime-only': 'on' }, 'v1')
      );

      const observed: boolean[] = [];
      start.getBooleanValue$('my-overridden-flag', true).subscribe((value) => observed.push(value));
      await Promise.resolve();

      await jest.advanceTimersByTimeAsync(0);
      // The poll updates overrides immediately. Subscribed evaluation waits out the debounce window.
      await jest.advanceTimersByTimeAsync(10);

      expect(setup.getOverrides()).toEqual({
        'my-overridden-flag': false,
        'myPlugin.myOverriddenFlag': true,
        'myDestructuredObjPlugin.myOverriddenFlag': true,
        'runtime-only': 'on',
      });
      expect(observed.at(-1)).toBe(false);
      await expect(start.getBooleanValue('my-overridden-flag', true)).resolves.toBe(false);
      await expect(start.getStringValue('runtime-only', 'off')).resolves.toBe('on');
    });

    test('ignores a polled document when its version did not change', async () => {
      jest.useFakeTimers();
      const { repository, setup } = startWithRepository();
      repository.get.mockResolvedValue(savedObject({ 'runtime-only': 'on' }, 'v1'));
      await jest.advanceTimersByTimeAsync(0);
      expect(setup.getOverrides()).toEqual(
        expect.objectContaining({ 'runtime-only': 'on', 'my-overridden-flag': true })
      );

      repository.get.mockResolvedValue(savedObject({ sneaky: true }, 'v1'));
      await jest.advanceTimersByTimeAsync(10_000);

      expect(setup.getOverrides()).not.toHaveProperty('sneaky');
      expect(setup.getOverrides()).toEqual(expect.objectContaining({ 'runtime-only': 'on' }));
    });

    test('clears runtime overrides when the saved object disappears', async () => {
      jest.useFakeTimers();
      const { repository, setup } = startWithRepository();
      repository.get.mockResolvedValue(savedObject({ 'runtime-only': 'on' }, 'v1'));
      await jest.advanceTimersByTimeAsync(0);
      expect(setup.getOverrides()['runtime-only']).toBe('on');

      repository.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      await jest.advanceTimersByTimeAsync(10_000);

      expect(setup.getOverrides()).not.toHaveProperty('runtime-only');
      expect(setup.getOverrides()['my-overridden-flag']).toBe(true);

      repository.get.mockResolvedValue(savedObject({ 'runtime-only': 'on' }, 'v1'));
      await jest.advanceTimersByTimeAsync(10_000);
      expect(setup.getOverrides()['runtime-only']).toBe('on');
    });

    test('does not clear a local write when an earlier poll finds no document', async () => {
      jest.useFakeTimers();
      const { repository, router, setup } = startWithRepository();
      const pending: Array<{
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
      }> = [];
      repository.get.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            pending.push({
              resolve: (value) => {
                resolve(value as never);
              },
              reject,
            });
          })
      );
      repository.create.mockResolvedValue(savedObject({ 'runtime-only': 'pinned' }, 'v2'));

      await jest.advanceTimersByTimeAsync(0);
      expect(pending).toHaveLength(1);

      const { handler } = findRoute(router, 'put', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      const response = mockRouter.createResponseFactory();
      const write = handler(
        {},
        mockRouter.createKibanaRequest({
          method: 'put',
          params: { flagKey: 'runtime-only' },
          body: { value: 'pinned' },
        }),
        response
      );
      await Promise.resolve();
      expect(pending).toHaveLength(2);
      pending[1].reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      await write;
      expect(setup.getOverrides()['runtime-only']).toBe('pinned');

      pending[0].reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      await Promise.resolve();

      expect(setup.getOverrides()['runtime-only']).toBe('pinned');
    });

    test('does not apply a stale poll that finishes after a local write', async () => {
      jest.useFakeTimers();
      const { repository, router, setup } = startWithRepository();
      const pending: Array<{
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
      }> = [];
      repository.get.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            pending.push({
              resolve: (value) => {
                resolve(value as never);
              },
              reject,
            });
          })
      );
      repository.create.mockResolvedValue(savedObject({ 'runtime-only': 'pinned' }, 'v2'));

      await jest.advanceTimersByTimeAsync(0);
      expect(pending).toHaveLength(1);

      const { handler } = findRoute(router, 'put', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      const response = mockRouter.createResponseFactory();
      const write = handler(
        {},
        mockRouter.createKibanaRequest({
          method: 'put',
          params: { flagKey: 'runtime-only' },
          body: { value: 'pinned' },
        }),
        response
      );
      await Promise.resolve();
      expect(pending).toHaveLength(2);
      pending[1].reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      await write;
      expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });

      pending[0].resolve(savedObject({ 'runtime-only': 'stale' }, 'v0'));
      await Promise.resolve();

      expect(setup.getOverrides()).toEqual(expect.objectContaining({ 'runtime-only': 'pinned' }));
      expect(setup.getOverrides()['runtime-only']).not.toBe('stale');
    });

    test('re-reads a newer document after a local write commits an older map', async () => {
      jest.useFakeTimers();
      const { repository, router, setup } = startWithRepository();
      const pending: Array<{
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
      }> = [];
      repository.get.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            pending.push({
              resolve: (value) => {
                resolve(value as never);
              },
              reject,
            });
          })
      );
      repository.create.mockResolvedValue(savedObject({ 'runtime-only': 'local' }, 'v2'));

      await jest.advanceTimersByTimeAsync(0);
      expect(pending).toHaveLength(1);

      const { handler } = findRoute(router, 'put', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      const response = mockRouter.createResponseFactory();
      const write = handler(
        {},
        mockRouter.createKibanaRequest({
          method: 'put',
          params: { flagKey: 'runtime-only' },
          body: { value: 'local' },
        }),
        response
      );
      await Promise.resolve();
      expect(pending).toHaveLength(2);

      pending[0].resolve(savedObject({ 'runtime-only': 'remote' }, 'v3'));
      await Promise.resolve();
      expect(setup.getOverrides()['runtime-only']).toBe('remote');

      pending[1].reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      await write;
      expect(setup.getOverrides()['runtime-only']).toBe('local');

      repository.get.mockResolvedValue(savedObject({ 'runtime-only': 'remote' }, 'v3'));
      await jest.advanceTimersByTimeAsync(10_000);

      expect(setup.getOverrides()['runtime-only']).toBe('remote');
    });

    test('warns when a runtime override is persisted and stays quiet when the write fails', async () => {
      jest.useFakeTimers();
      const { repository, router } = startWithRepository();
      repository.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
          FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
        )
      );
      repository.create.mockResolvedValue(savedObject({}, 'v1'));
      repository.create.mockRejectedValueOnce(new Error('disk full'));
      await jest.advanceTimersByTimeAsync(0);

      const persistedWarnings = () =>
        loggerMock
          .collect(logger)
          .warn.map(([message]) => String(message))
          .filter((message) => message.startsWith('Feature flag overrides:'));

      const put = findRoute(router, 'put', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      const remove = findRoute(router, 'delete', `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`);
      const clear = findRoute(router, 'delete', FEATURE_FLAGS_OVERRIDES_API_PATH);
      const failed = mockRouter.createResponseFactory();

      await expect(
        put.handler(
          {},
          mockRouter.createKibanaRequest({
            method: 'put',
            params: { flagKey: 'my-flag' },
            body: { value: 'on' },
          }),
          failed
        )
      ).rejects.toThrow('disk full');
      expect(persistedWarnings()).toEqual([]);

      const response = mockRouter.createResponseFactory();
      await put.handler(
        {},
        mockRouter.createKibanaRequest({
          method: 'put',
          params: { flagKey: 'my-flag' },
          body: { value: 'on' },
        }),
        response
      );
      await remove.handler(
        {},
        mockRouter.createKibanaRequest({
          method: 'delete',
          params: { flagKey: 'my-flag' },
        }),
        response
      );
      await clear.handler({}, mockRouter.createKibanaRequest({ method: 'delete' }), response);

      expect(persistedWarnings()).toEqual([
        'Feature flag overrides: persisted "my-flag" = "on"',
        'Feature flag overrides: removed "my-flag"',
        'Feature flag overrides: cleared all runtime overrides',
      ]);
    });
  });
});
