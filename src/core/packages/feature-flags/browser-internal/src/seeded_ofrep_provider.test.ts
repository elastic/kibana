/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ClientProviderEvents,
  ErrorCode,
  OpenFeatureEventEmitter,
  ProviderFatalError,
  type EvaluationContext,
  type JsonValue,
  type ResolutionDetails,
} from '@openfeature/web-sdk';
import type { OFREPWebProviderOptions } from '@openfeature/ofrep-web-provider';
import { SeededOfrepWebProvider } from './seeded_ofrep_provider';

describe('SeededOfrepWebProvider', () => {
  const ofrep = { baseUrl: 'http://kibana/internal/feature-flags/' } as OFREPWebProviderOptions;

  const createDelegate = () => {
    let resolveInit: () => void = () => undefined;
    let rejectInit: (error: Error) => void = () => undefined;
    const events = new OpenFeatureEventEmitter();
    const delegate = {
      events,
      flagCache: {} as Record<string, { value?: unknown; errorCode?: string }>,
      initialize: jest.fn(
        (_context?: EvaluationContext, _domain?: string) =>
          new Promise<void>((resolve, reject) => {
            resolveInit = resolve;
            rejectInit = reject;
          })
      ),
      onContextChange: jest.fn(),
      onClose: jest.fn(),
      resolveBooleanEvaluation: jest.fn(
        (_flagKey: string, defaultValue: boolean): ResolutionDetails<boolean> => ({
          value: defaultValue,
        })
      ),
      resolveStringEvaluation: (
        _flagKey: string,
        defaultValue: string
      ): ResolutionDetails<string> => ({
        value: defaultValue,
      }),
      resolveNumberEvaluation: (
        _flagKey: string,
        defaultValue: number
      ): ResolutionDetails<number> => ({
        value: defaultValue,
      }),
      resolveObjectEvaluation: <T extends JsonValue>(
        _flagKey: string,
        defaultValue: T
      ): ResolutionDetails<T> => ({
        value: defaultValue,
      }),
    };
    return {
      delegate,
      resolveInit: () => resolveInit(),
      rejectInit: (error: Error) => rejectInit(error),
      events,
    };
  };

  test('does not let the OFREP provider persist flags in localStorage', () => {
    const createProvider = jest.fn(() => createDelegate().delegate);
    new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { 'my.flag': true },
      createProvider,
    });

    expect(createProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://kibana/internal/feature-flags/',
        cacheMode: 'disabled',
      })
    );
  });

  test('serves injected flags until the OFREP provider responds', async () => {
    const { delegate, resolveInit } = createDelegate();
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { 'my.flag': true },
      createProvider: () => delegate,
    });

    const starting = provider.initialize();
    expect(provider.resolveBooleanEvaluation('my.flag', false, {})).toEqual({
      value: true,
      reason: 'CACHED',
    });
    expect(provider.resolveBooleanEvaluation('missing', false, {})).toEqual(
      expect.objectContaining({ value: false, errorCode: 'FLAG_NOT_FOUND' })
    );

    delegate.flagCache['my.flag'] = { value: true };
    resolveInit();
    await starting;
    provider.resolveBooleanEvaluation('my.flag', false, {});
    expect(delegate.resolveBooleanEvaluation).toHaveBeenCalledWith('my.flag', false, {}, undefined);
  });

  test('treats string config overrides as booleans', async () => {
    const { delegate, resolveInit } = createDelegate();
    delegate.resolveBooleanEvaluation.mockReturnValue({
      value: false,
      reason: 'ERROR',
      errorCode: ErrorCode.TYPE_MISMATCH,
    });
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { enabled: 'true', disabled: 'false' },
      createProvider: () => delegate,
    });

    expect(provider.resolveBooleanEvaluation('enabled', false, {})).toEqual({
      value: true,
      reason: 'CACHED',
    });
    expect(provider.resolveBooleanEvaluation('disabled', true, {})).toEqual({
      value: false,
      reason: 'CACHED',
    });

    delegate.flagCache = {
      enabled: { value: 'true' },
      disabled: { value: 'false' },
    };
    const starting = provider.initialize();
    resolveInit();
    await starting;

    expect(provider.resolveBooleanEvaluation('enabled', false, {})).toEqual({
      value: true,
      reason: 'CACHED',
    });
    expect(provider.resolveBooleanEvaluation('disabled', true, {})).toEqual({
      value: false,
      reason: 'CACHED',
    });
  });

  test('reports only flags that differ from the injected values', async () => {
    const { delegate, resolveInit } = createDelegate();
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { stable: true, changed: false },
      createProvider: () => delegate,
    });
    const flagsChanged: string[][] = [];
    provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, (details) => {
      flagsChanged.push((details?.flagsChanged ?? []) as string[]);
    });

    delegate.flagCache = {
      stable: { value: true },
      changed: { value: true },
    };
    const starting = provider.initialize();
    resolveInit();
    await starting;

    expect(flagsChanged).toEqual([['changed']]);
  });

  test('keeps the injected flags when the first fetch fails', async () => {
    const { delegate, rejectInit } = createDelegate();
    const logger = { warn: jest.fn() };
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { 'my.flag': true },
      logger,
      createProvider: () => delegate,
    });

    const starting = provider.initialize();
    rejectInit(new Error('network down'));
    await expect(starting).resolves.toBeUndefined();
    expect(provider.resolveBooleanEvaluation('my.flag', false, {})).toEqual({
      value: true,
      reason: 'CACHED',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('network down'));
    await provider.onClose();
  });

  test('serves the live evaluation after a failed activation recovers', async () => {
    jest.useFakeTimers();
    try {
      const { delegate, rejectInit, resolveInit } = createDelegate();
      const provider = new SeededOfrepWebProvider({
        ofrep: { ...ofrep, pollInterval: 10_000 },
        initialFlags: { 'my.flag': true },
        createProvider: () => delegate,
      });
      const flagsChanged: string[][] = [];
      provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, (details) => {
        flagsChanged.push((details?.flagsChanged ?? []) as string[]);
      });

      const starting = provider.initialize();
      rejectInit(new Error('network down'));
      await starting;
      expect(delegate.initialize).toHaveBeenCalledTimes(1);

      delegate.flagCache = { 'my.flag': { value: false } };
      await jest.advanceTimersByTimeAsync(10_000);
      resolveInit();
      await Promise.resolve();

      expect(flagsChanged).toEqual([['my.flag']]);
      provider.resolveBooleanEvaluation('my.flag', true, {});
      expect(delegate.resolveBooleanEvaluation).toHaveBeenCalledWith(
        'my.flag',
        true,
        {},
        undefined
      );
      await provider.onClose();
    } finally {
      jest.useRealTimers();
    }
  });

  test('does not retry an irrecoverable provider error', async () => {
    jest.useFakeTimers();
    try {
      const { delegate, rejectInit } = createDelegate();
      const provider = new SeededOfrepWebProvider({
        ofrep: { ...ofrep, pollInterval: 10_000 },
        initialFlags: { 'my.flag': true },
        createProvider: () => delegate,
      });

      const starting = provider.initialize();
      rejectInit(new ProviderFatalError('unauthorized'));
      await starting;
      await jest.advanceTimersByTimeAsync(10_000);

      expect(delegate.initialize).toHaveBeenCalledTimes(1);
      expect(provider.resolveBooleanEvaluation('my.flag', false, {})).toEqual({
        value: true,
        reason: 'CACHED',
      });
      await provider.onClose();
    } finally {
      jest.useRealTimers();
    }
  });

  test('serves fallbacks when the seed is empty and the first request fails', async () => {
    const { delegate, rejectInit } = createDelegate();
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: {},
      createProvider: () => delegate,
    });

    const starting = provider.initialize();
    rejectInit(new Error('network down'));
    await expect(starting).resolves.toBeUndefined();
    expect(provider.resolveBooleanEvaluation('my.flag', false, {})).toEqual(
      expect.objectContaining({ value: false, errorCode: 'FLAG_NOT_FOUND' })
    );
    await provider.onClose();
  });

  test('retries an empty seed without an unhandled rejection', async () => {
    jest.useFakeTimers();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const { delegate, rejectInit, resolveInit } = createDelegate();
      const provider = new SeededOfrepWebProvider({
        ofrep: { ...ofrep, pollInterval: 10_000 },
        initialFlags: {},
        createProvider: () => delegate,
      });
      const flagsChanged: string[][] = [];
      provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, (details) => {
        flagsChanged.push((details?.flagsChanged ?? []) as string[]);
      });

      const starting = provider.initialize();
      rejectInit(new Error('network down'));
      await expect(starting).resolves.toBeUndefined();

      await jest.advanceTimersByTimeAsync(10_000);
      rejectInit(new Error('still down'));
      await jest.advanceTimersByTimeAsync(0);
      expect(delegate.initialize).toHaveBeenCalledTimes(2);
      expect(unhandled).toEqual([]);

      delegate.flagCache = { 'my.flag': { value: true } };
      await jest.advanceTimersByTimeAsync(10_000);
      resolveInit();
      await Promise.resolve();

      expect(delegate.initialize).toHaveBeenCalledTimes(3);
      expect(flagsChanged).toEqual([['my.flag']]);
      expect(unhandled).toEqual([]);
      await provider.onClose();
    } finally {
      process.off('unhandledRejection', onUnhandled);
      jest.useRealTimers();
    }
  });

  test('forwards later context changes to the OFREP provider', async () => {
    const { delegate, resolveInit } = createDelegate();
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { stable: true },
      createProvider: () => delegate,
    });
    const starting = provider.initialize({ targetingKey: 'deployment' });
    delegate.flagCache = { stable: { value: true } };
    resolveInit();
    await starting;

    const nextContext: EvaluationContext = { targetingKey: 'deployment', has_data: true };
    await provider.onContextChange({ targetingKey: 'deployment' }, nextContext);
    expect(delegate.onContextChange).toHaveBeenCalledWith(
      { targetingKey: 'deployment' },
      nextContext
    );
  });
});
