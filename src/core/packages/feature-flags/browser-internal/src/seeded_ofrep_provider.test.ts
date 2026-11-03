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
  OpenFeatureEventEmitter,
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
      initialize: (_context?: EvaluationContext, _domain?: string) =>
        new Promise<void>((resolve, reject) => {
          resolveInit = resolve;
          rejectInit = reject;
        }),
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

  test('asks the OFREP provider for a network evaluation before any persisted cache', () => {
    const createProvider = jest.fn(() => createDelegate().delegate);
    new SeededOfrepWebProvider({
      ofrep,
      initialFlags: { 'my.flag': true },
      createProvider,
    });

    expect(createProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://kibana/internal/feature-flags/',
        cacheMode: 'network-first',
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
  });

  test('fails initialization when there is no injected flag and the fetch fails', async () => {
    const { delegate, rejectInit } = createDelegate();
    const provider = new SeededOfrepWebProvider({
      ofrep,
      initialFlags: {},
      createProvider: () => delegate,
    });

    const starting = provider.initialize();
    rejectInit(new Error('network down'));
    await expect(starting).rejects.toThrow('network down');
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
